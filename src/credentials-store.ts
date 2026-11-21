import { randomUUID } from 'node:crypto';
import { open, readFile, realpath, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Credentials } from './client';
import { HomeWizardError } from './errors';

/**
 * Keeps the credentials of your devices between runs, under a key you choose per device, such as `p1`. Use
 * `createFileStore()` for scripts, and `createMemoryStore()` for tests. For a platform with its own storage, such
 * as the config store of Homebridge or Node-RED or a keychain, implement these three methods.
 *
 * @example
 * const credentialsStore = createFileStore('devices.json');
 *
 * let credentials = await credentialsStore.get('p1');
 *
 * if (!credentials) {
 *   credentials = await pair('192.168.1.35', 'my-app');
 *   await credentialsStore.set('p1', credentials);
 * }
 *
 * const p1 = new P1Meter(credentials);
 */
export interface CredentialsStore {
  /** Returns the credentials stored under the key, or `undefined` when there are none. */
  get(key: string): Promise<Credentials | undefined>;
  /** Stores the credentials under the key, in place of any stored before. */
  set(key: string, credentials: Credentials): Promise<void>;
  /** Removes the credentials stored under the key. Does nothing when there are none. */
  delete(key: string): Promise<void>;
}

/** Keeps the credentials in memory, so they are gone when the process ends. Use it in tests. */
export function createMemoryStore(): CredentialsStore {
  const entries = new Map<string, Credentials>();

  return {
    get: async key => {
      const credentials = entries.get(key);
      return credentials && { ...credentials };
    },
    set: async (key, credentials) => {
      entries.set(key, toCredentials(credentials));
    },
    delete: async key => {
      entries.delete(key);
    },
  };
}

/**
 * Keeps the credentials in a JSON file, with an object per key. The file is created on the first `set()`, readable
 * and writable by its owner only (`0600`, where the platform supports it), and replaced in one step on each change:
 * the new file is written in full and flushed to disk before it takes the place of the old one, so a crash or a
 * power loss leaves the old file or the new one, never half of one. When the path is a symbolic link, the file it
 * points to is replaced.
 *
 * The calls run one at a time per file, in all the stores of one process. Separate processes that change the same
 * file at the same time can overwrite each other's change.
 *
 * Each entry is checked when it's read: `get()` throws for an entry without a host, token and identifier, while
 * `set()` and `delete()` can still replace or remove it. Entries are written back as they are, so fields you add
 * to an entry yourself stay, until `set()` replaces that entry.
 *
 * Throws a `HomeWizardError` of kind `storage` when the file can't be read or written, isn't a JSON object, or
 * has an invalid entry under the key that's read. Keep the file out of version control: its tokens give full access
 * to the devices.
 *
 * @example
 * const credentialsStore = createFileStore('devices.json');
 * // {
 * //   "p1": {
 * //     "host": "192.168.1.35",
 * //     "token": "0123456789ABCDEF0123456789ABCDEF",
 * //     "identifier": "appliance/p1dongle/5c2fafaabbcc"
 * //   }
 * // }
 */
export function createFileStore(path: string): CredentialsStore {
  if (typeof path !== 'string' || path === '') {
    throw new HomeWizardError('invalid', 'The path of the credentials file is required');
  }

  const queueKey = resolve(path);

  const update = (change: (entries: Map<string, unknown>) => boolean) =>
    serialize(queueKey, async () => {
      const entries = await readEntries(path);
      if (change(entries)) await writeEntries(path, entries);
    });

  return {
    get: key =>
      serialize(queueKey, async () => {
        const value = (await readEntries(path)).get(key);
        if (value === undefined) return undefined;

        if (!isCredentials(value)) {
          throw new HomeWizardError(
            'storage',
            `The credentials of "${key}" in ${path} need a host, token and identifier`,
            { path },
          );
        }

        return toCredentials(value);
      }),
    set: async (key, credentials) => {
      // Checked before the file is read, so a wrong argument is an `invalid` error, not a `storage` one
      const checked = toCredentials(credentials);
      await update(entries => {
        entries.set(key, checked);
        return true;
      });
    },
    delete: key => update(entries => entries.delete(key)),
  };
}

/** The last call on each file, by its absolute path, so the stores of one process take turns on a file. */
const queues = new Map<string, Promise<unknown>>();

/** Runs the calls on one file one at a time, so two set() calls can't both read the file before either writes it. */
function serialize<T>(queueKey: string, fn: () => Promise<T>): Promise<T> {
  const result = (queues.get(queueKey) ?? Promise.resolve()).then(fn);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );

  queues.set(queueKey, settled);
  // Forgets the file once its last call is done, so the map only holds files that are in use
  void settled.then(() => {
    if (queues.get(queueKey) === settled) queues.delete(queueKey);
  });

  return result;
}

/** Returns a copy with only the fields of the credentials, or throws when they aren't credentials. */
function toCredentials(value: unknown): Credentials {
  if (!isCredentials(value)) {
    throw new HomeWizardError('invalid', 'The credentials need a host, token and identifier');
  }

  return { host: value.host, token: value.token, identifier: value.identifier };
}

/** The identifier may be empty, for a device used with `insecure: true`. */
function isCredentials(value: unknown): value is Credentials {
  if (typeof value !== 'object' || value === null) return false;

  const { host, token, identifier } = value as Record<string, unknown>;
  return (
    typeof host === 'string' &&
    host !== '' &&
    typeof token === 'string' &&
    token !== '' &&
    typeof identifier === 'string'
  );
}

/** Reads the entries as they are in the file, so an invalid one can still be replaced or removed. */
async function readEntries(path: string): Promise<Map<string, unknown>> {
  let text: string;

  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw new HomeWizardError('storage', `Couldn't read the credentials file ${path}`, {
      path,
      cause: error,
    });
  }

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new HomeWizardError('storage', `The credentials file ${path} isn't valid JSON`, {
      path,
      cause: error,
    });
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new HomeWizardError('storage', `The credentials file ${path} isn't an object`, { path });
  }

  // A Map, so a key such as "__proto__" stays a key
  return new Map(Object.entries(data));
}

async function writeEntries(path: string, entries: Map<string, unknown>): Promise<void> {
  // A symbolic link stays a link: the file it points to is replaced. A file that doesn't exist yet has no target.
  const target = await realpath(path).catch(() => path);
  // Written next to the file and renamed over it, so readers see the old file or the new one, never half of one
  const temporary = `${target}.${randomUUID()}.tmp`;

  try {
    const handle = await open(temporary, 'wx', 0o600);

    try {
      await handle.writeFile(`${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`);
      // On disk before the rename, so a power loss can't leave the new name on an empty file
      await handle.sync();
    } finally {
      await handle.close();
    }

    await rename(temporary, target);
  } catch (error) {
    // A failed cleanup must not hide why the write failed
    await Promise.allSettled([rm(temporary, { force: true })]);
    throw new HomeWizardError('storage', `Couldn't write the credentials file ${path}`, {
      path,
      cause: error,
    });
  }
}
