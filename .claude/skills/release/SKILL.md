---
name: release
description: Release the next version of homewizard-energy-api to GitHub and npm.
disable-model-invocation: true
---

# Release

The maintainer invoking this skill is the go-ahead to release. Run the steps in order; each ends on its **done** line. Stop and ask the maintainer only on an **escalation**: a case below that says so, or a step whose done line you can't reach.

The pipeline: release-it (configured in `.release-it.cjs`) bumps the version from the Conventional Commits since the last tag, writes `CHANGELOG.md`, commits `chore(release): vX.Y.Z`, tags `X.Y.Z` (no `v`), pushes, and creates the GitHub release. That release triggers `.github/workflows/publish-npm-package.yml`, which publishes to npm through trusted publishing (OIDC). No npm token is involved.

## 1. Preflight

- `git fetch` and `git status -sb`: on `main`, clean, neither ahead of nor behind `origin/main`.
- `.env` holds a non-empty `GITHUB_TOKEN`. Check its presence without printing the value, e.g. `awk -F= '/^GITHUB_TOKEN=/{print length($2)}' .env`.

**Done:** every check passes. A dirty tree, a missing token, or a branch other than `main` is an escalation.

## 2. Preview

```bash
npx --no-install dotenv -- release-it --release-version
npx --no-install dotenv -- release-it --changelog
```

Show the maintainer the version and the notes.

**Done:** the version and notes are shown. Escalate before releasing when:

- the output warns that `GITHUB_TOKEN` is required (the token is missing or expired, and release-it would fall back to a browser URL),
- the bump is major (confirm the breaking change is intended),
- the notes are empty (nothing releasable since the last tag),
- the maintainer asked for a specific increment that differs from the preview. Pass it to step 3 as `release-it <patch|minor|major> --ci`.

## 3. Release

```bash
npx --no-install dotenv -- release-it --ci
```

Call release-it through `npx dotenv --` as shown. `npm run release -- --ci` loses `--ci` inside `dotenv`, so release-it waits at its first prompt, then rolls back.

The husky pre-commit hook runs `npm test` on the release commit. A failing test makes release-it roll back, which is an escalation.

**Done:** the output ends with `🏁 Done`, prints the release URL, and `git ls-remote --tags origin X.Y.Z` lists the tag.

## 4. Publish

Find the run the release triggered and watch it in the background:

```bash
gh run list --workflow publish-npm-package.yml --limit 1 --json databaseId,status,headBranch
gh run watch <id> --exit-status
```

**Done:** `headBranch` is the new tag, both the `build` and `publish-npm` jobs succeed, and the log contains `Provenance statement published to transparency log`. On failure, read `gh run view <id> --log-failed` and see **Publish failures**.

## 5. Verify

```bash
npm view homewizard-energy-api@X.Y.Z version dist.fileCount dist-tags.latest
```

The registry can lag several minutes behind a successful publish, so an E404 right after the job finishes is normal. Retry a few minutes apart.

**Done:** the version resolves, `dist-tags.latest` is the new version, and `dist.fileCount` is in the high 40s. Many more files means something outside `dist/` was packed; check the `files` allowlist in `package.json`.

## 6. Report

Give the maintainer the GitHub release URL and the npm version, plus anything you escalated or retried.

## Publish failures

Each failure here is an escalation: the fix lives on npmjs.com or in a repo setting, which only the maintainer controls. After they fix it, re-run with `gh run rerun <id> --failed`. A re-run uses the workflow file as it is at the tag, not the one on `main`.

- **`E404` or `ENEEDAUTH` on `npm publish`:** npm didn't accept the OIDC identity. The trusted publisher in the package settings on npmjs.com must have owner `jvandenaardweg`, repo `homewizard-energy-api`, workflow `publish-npm-package.yml`, no environment, and **npm publish** ticked under allowed actions. Every value is case-sensitive. The job log's `npm --version` must print 11.5.1 or later.
- **`EOTP`:** something published with a token instead of OIDC. That shouldn't happen with the current workflow, so check whether `NODE_AUTH_TOKEN` was added back.

## GitHub release missing

If step 3 pushed the tag but didn't create the GitHub release (an expired `GITHUB_TOKEN`, or a browser fallback that failed with "URL too long"), create the release from the new version's section in `CHANGELOG.md`. Creating it triggers the publish workflow, so continue at step 4.

```bash
awk '/^## \[X\.Y\.Z\]/{f=1;print;next} /^## /{f=0} f' CHANGELOG.md > <scratch>/notes.md
gh release create X.Y.Z --title vX.Y.Z --notes-file <scratch>/notes.md --verify-tag
```
