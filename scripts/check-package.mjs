// Checks the package the way a user gets it: `npm run test:package` builds it, then this script packs it, installs
// the tarball into an empty project, and there:
//
// 1. imports and requires each entry point (ESM and CommonJS),
// 2. type-checks the entry points with the `nodenext` and `bundler` module resolutions,
// 3. type-checks the TypeScript examples in README.md against the installed package.
//
// The unit tests run from `src`, so they can't catch a wrong `exports` map, a file missing from the tarball or an
// import without its `.js` extension. This does.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const workDir = mkdtempSync(join(tmpdir(), 'homewizard-energy-api-package-'));
const projectDir = join(workDir, 'project');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const step = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error.stdout || '', error.stderr || '', error.stdout ? '' : error);
    process.exitCode = 1;
  }
};

/** Type-checks files in the project, with the compiler and the Node types of this repo. */
const typeCheck = (files, module, moduleResolution) =>
  run(
    process.execPath,
    [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--target',
      'ES2024',
      '--lib',
      'ES2024',
      '--module',
      module,
      '--moduleResolution',
      moduleResolution,
      '--types',
      'node',
      '--typeRoots',
      join(root, 'node_modules', '@types'),
      ...files,
    ],
    projectDir,
  );

const RUNTIME_NAMES = {
  'homewizard-energy-api': [
    'P1Meter',
    'pair',
    'connect',
    'discover',
    'poll',
    'HomeWizardError',
    'createFileStore',
    'createMemoryStore',
  ],
  'homewizard-energy-api/v1': ['EnergySocketApi', 'P1MeterApi', 'HomeWizardEnergyDiscovery'],
  'homewizard-energy-api/telegram': ['parseTelegram'],
};

/** A script that loads each entry point and fails when one of its names isn't a function. */
const loadScript = load =>
  Object.entries(RUNTIME_NAMES)
    .map(
      ([specifier, names]) => `{
  const entry = ${load(specifier)};
  for (const name of ${JSON.stringify(names)}) {
    if (typeof entry[name] !== 'function') throw new Error('${specifier} has no ' + name);
  }
}`,
    )
    .join('\n');

/**
 * Turns the TypeScript examples of the README into files to type-check. Each example's code becomes its own async
 * function, because the examples declare the same names. Its imports are checked in a file of their own.
 */
function writeReadmeExamples() {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const examples = [...readme.matchAll(/```typescript\n([\s\S]*?)```/g)].map(match => match[1]);
  const files = [];

  const preamble = `import { connect, createFileStore, createMemoryStore, discover, HomeWizardError, isApiVersionAtLeast, isSameIdentifier, pair, P1Meter, PlugInBattery, poll, type Credentials, type CredentialsStore } from 'homewizard-energy-api';
import { parseTelegram } from 'homewizard-energy-api/telegram';
import { EnergySocketApi, HomeWizardEnergyDiscovery, P1MeterApi, WaterMeterApi } from 'homewizard-energy-api/v1';

// What the examples assume to exist
declare const credentials: Credentials;
declare const config: { devices: Record<string, Credentials> };
declare const credentialsStore: CredentialsStore;
declare const p1: P1Meter;
declare const battery: PlugInBattery;
declare const controller: AbortController;
declare const socket: EnergySocketApi;

void [connect, createFileStore, createMemoryStore, discover, HomeWizardError, isApiVersionAtLeast, isSameIdentifier, pair, PlugInBattery, poll];
void [parseTelegram, HomeWizardEnergyDiscovery, P1MeterApi, WaterMeterApi];
`;

  const functions = examples.map((example, index) => {
    const lines = example.split('\n');
    const imports = lines.filter(line => line.startsWith('import '));

    if (imports.length) {
      const file = `readme-imports-${index + 1}.ts`;
      writeFileSync(join(projectDir, file), `${imports.join('\n')}\nexport {};\n`);
      files.push(file);
    }

    const body = lines.filter(line => !line.startsWith('import ')).map(line => `  ${line}`);

    return `export async function example${index + 1}() {\n${body.join('\n')}\n}`;
  });

  writeFileSync(join(projectDir, 'readme-examples.ts'), `${preamble}\n${functions.join('\n\n')}\n`);
  files.push('readme-examples.ts');

  return { files, count: examples.length };
}

try {
  let tarball;

  step('pack the package', () => {
    const [packed] = JSON.parse(
      run(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', workDir], root),
    );
    tarball = join(workDir, packed.filename);

    const unexpected = packed.files
      .map(file => file.path)
      .filter(path => /(^|\/)(mocks|examples)\/|\.test\./.test(path));
    if (unexpected.length) throw new Error(`The tarball has test files: ${unexpected.join(', ')}`);
  });

  step('install it into an empty project', () => {
    mkdirSync(projectDir);
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({ name: 'consumer', private: true, type: 'module' }),
    );
    run(
      npm,
      ['install', tarball, '--no-audit', '--no-fund', '--ignore-scripts', '--prefer-offline'],
      projectDir,
    );
  });

  step('import each entry point (ESM)', () => {
    writeFileSync(
      join(projectDir, 'esm.mjs'),
      loadScript(specifier => `await import('${specifier}')`),
    );
    run(process.execPath, ['esm.mjs'], projectDir);
  });

  step('require each entry point (CommonJS)', () => {
    writeFileSync(
      join(projectDir, 'cjs.cjs'),
      loadScript(specifier => `require('${specifier}')`),
    );
    run(process.execPath, ['cjs.cjs'], projectDir);
  });

  writeFileSync(
    join(projectDir, 'types.ts'),
    `import { P1Meter, type Credentials, type P1MeterMeasurement } from 'homewizard-energy-api';
import { EnergySocketApi, type EnergySocketDataResponse } from 'homewizard-energy-api/v1';
import { parseTelegram, type ParsedTelegram } from 'homewizard-energy-api/telegram';

export type Types = [Credentials, P1MeterMeasurement, EnergySocketDataResponse, ParsedTelegram];
export const values = [P1Meter, EnergySocketApi, parseTelegram];
`,
  );

  step('type-check the entry points (nodenext)', () =>
    typeCheck(['types.ts'], 'nodenext', 'nodenext'),
  );
  step('type-check the entry points (bundler)', () => typeCheck(['types.ts'], 'esnext', 'bundler'));

  const readme = writeReadmeExamples();

  step(`type-check the ${readme.count} TypeScript examples of the README`, () =>
    typeCheck(readme.files, 'nodenext', 'nodenext'),
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
