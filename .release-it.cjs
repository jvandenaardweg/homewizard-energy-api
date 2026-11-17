'use strict';

const fs = require('fs');
const path = require('path');
const { author } = require('./package.json');

// An introduction for a big release: .github/release-notes/<version>.md, rendered above the commit groups as the
// preset's preamble. Releases without such a file get the generated notes only.
const readReleaseIntroduction = version => {
  const file = path.join(__dirname, '.github', 'release-notes', `${version}.md`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : undefined;
};

// Rendered after the commit groups by the preset's main template, which calls `footerPartial` last.
// The preset renders with plain functions since v10, so this replaces the old Handlebars mainTemplate.
const footerPartial = context =>
  context.contributors && context.contributors.length > 0
    ? [
        '### Contributors',
        context.contributors.map(contributor => `* ${contributor}`).join('\n'),
      ].join('\n\n')
    : '';

const maintainerName = author.name.toLowerCase();
const maintainerLogin = author.url.split('/').pop().toLowerCase();

// Bots and AI coding agents that show up as commit authors or Co-authored-by trailers.
// GitHub App bots (dependabot, copilot-swe-agent, devin-ai-integration, google-labs-jules,
// chatgpt-codex-connector, gemini-code-assist, cursor, ...) all carry a `[bot]` suffix.
const automatedNamePattern =
  /\[bot\]|\bclaude\b|^copilot$|\bcodex\b|\bchatgpt\b|\bcursor agent\b|\(aider\)|^github$/i;
const automatedEmailPattern =
  /\[bot\]@|^noreply@anthropic\.com$|^cursoragent@cursor\.com$|\+copilot@users\.noreply\.github\.com$|^noreply@openai\.com$/i;

const isAutomated = person =>
  person.type === 'Bot' ||
  automatedNamePattern.test(person.name || '') ||
  automatedNamePattern.test(person.login || '') ||
  automatedEmailPattern.test(person.email || '');

const isMaintainer = person =>
  (person.name || '').toLowerCase() === maintainerName ||
  (person.login || '').toLowerCase() === maintainerLogin;

// `123+login@users.noreply.github.com` or `login@users.noreply.github.com`
const loginFromNoreplyEmail = email => {
  const match = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(email || '');
  return match ? match[1] : undefined;
};

const parseCoAuthors = value =>
  (value || '')
    .split('\n')
    .map(line => /^\s*(.+?)\s*<([^>]+)>\s*$/.exec(line))
    .filter(Boolean)
    .map(([, name, email]) => ({ name, email }));

// Look up the GitHub account behind a commit, so the changelog can link a profile and skip bots.
// Falls back to the git name and email when the lookup fails (offline, rate limited, ...).
const fetchCommitAuthor = async (context, hash) => {
  const fetch = globalThis.fetch || require('undici').fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const url = `https://api.github.com/repos/${context.owner}/${context.repository}/commits/${hash}`;
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) return undefined;
    const body = await response.json();
    return body.author ? { login: body.author.login, type: body.author.type } : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
};

const formatContributor = person =>
  person.login ? `[@${person.login}](https://github.com/${person.login})` : person.name;

const uniqueBy = (items, key) => {
  const seen = new Set();
  return items.filter(item => !seen.has(key(item)) && seen.add(key(item)));
};

// The people to thank for one commit: its author and co-authors, minus the maintainer and bots.
const getCommitContributors = async (context, commit) => {
  const commitAuthor = { name: commit.authorName, email: commit.authorEmail };
  commitAuthor.login = loginFromNoreplyEmail(commitAuthor.email);

  // Only ask GitHub about authors that would otherwise be listed.
  if (!isAutomated(commitAuthor) && !isMaintainer(commitAuthor)) {
    Object.assign(commitAuthor, await fetchCommitAuthor(context, commit.hash));
  }

  const coAuthors = parseCoAuthors(commit.coAuthors).map(coAuthor => ({
    ...coAuthor,
    login: loginFromNoreplyEmail(coAuthor.email),
  }));

  const people = [commitAuthor, ...coAuthors].filter(
    person => person.name && !isAutomated(person) && !isMaintainer(person),
  );

  return uniqueBy(people, person => (person.login || person.email || person.name).toLowerCase());
};

// Everyone to thank for the commits listed in the release.
const getContributors = async context => {
  const contributors = [];

  for (const group of context.commitGroups) {
    for (const commit of group.commits) {
      contributors.push(...(await getCommitContributors(context, commit)).map(formatContributor));
    }
  }

  return uniqueBy(contributors, contributor => contributor.toLowerCase());
};

module.exports = {
  git: {
    commitMessage: 'chore(release): v${version}',
  },
  plugins: {
    '@release-it/conventional-changelog': {
      infile: 'CHANGELOG.md',
      header: '# Changelog',
      preset: {
        name: 'conventionalcommits',
        types: [
          { type: 'feat', section: 'Features' },
          { type: 'feature', section: 'Features' },
          { type: 'fix', section: 'Bug Fixes' },
          { type: 'perf', section: 'Performance Improvements' },
          { type: 'revert', section: 'Reverts' },
          { type: 'docs', section: 'Documentation' },
          { type: 'chore', scope: 'release', hidden: true },
          { type: 'refactor', section: 'Other Changes' },
          { type: 'test', section: 'Other Changes' },
          { type: 'chore', section: 'Other Changes' },
          { type: 'ci', section: 'Other Changes' },
          { type: 'build', section: 'Other Changes' },
          { type: 'style', section: 'Other Changes' },
        ],
      },
      gitRawCommitsOpts: {
        // The default conventional-changelog format, plus the author and Co-authored-by trailers.
        // %aN/%aE apply .mailmap.
        format: [
          '%B',
          '-hash-',
          '%H',
          '-gitTags-',
          '%d',
          '-committerDate-',
          '%ci',
          '-authorName-',
          '%aN',
          '-authorEmail-',
          '%aE',
          '-coAuthors-',
          '%(trailers:key=Co-authored-by,valueonly)',
        ].join('%n'),
      },
      writerOpts: {
        footerPartial,
        // Replaces conventional-changelog-core's finalizeContext. release-it always passes
        // currentTag and previousTag, so linkCompare is the only part of it that applies here.
        finalizeContext: async context => {
          if (
            typeof context.linkCompare !== 'boolean' &&
            context.previousTag &&
            context.currentTag
          ) {
            context.linkCompare = true;
          }
          // The chore(release) type is hidden, but its commits still arrive in a group without a title, which
          // renders as a stray line under the breaking changes. Every other type has a section.
          context.commitGroups = context.commitGroups.filter(group => group.title);
          context.contributors = await getContributors(context);
          context.preamble = readReleaseIntroduction(context.version) ?? context.preamble;
          return context;
        },
      },
    },
  },
  npm: {
    publish: false,
  },
  github: {
    release: true,
    releaseName: 'v${version}',
  },
};
