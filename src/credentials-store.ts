import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';

import type { Credentials } from './client';
import { HomeWizardError } from './errors';

/**
 * Keeps the credentials of your devices between runs, under a key you choose per device, such as `p1`. Use
 * `createFileStore()` for scripts, and `createMemoryStore()` for tests. For a platform with its own storage, such
 * as the config store of Homebridge or Node-RED or a keychain, implement these three methods.
 *
 * @example
 * const store = createFileStore('devices.json');
 *
 * const credentials = (await store.get('p1')) ?? (await pair('192.168.1.35', 'my-app'));
 * await store.set('p1', credentials);
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
 * and writable by its owner only (`0600`, where the platform supports it), and replaced in one step on each change,
 * so a crash never leaves half a file. The calls on one store run one at a time.
 *
 * Throws a `HomeWizardError` of kind `storage` when the file can't be read or written, or isn't a file this store
 * wrote. Keep the file out of version control: its tokens give full access to the devices.
 *
 * @example
 * const store = createFileStore('devices.json');
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

  let queue: Promise<unknown> = Promise.resolve();

  // Runs the calls one at a time, so two set() calls can't both read the file before either writes it
  const serialize = <T>(fn: () => Promise<T>): Promise<T> => {
    const result = queue.then(fn);
    queue = result.catch(() => undefined);
    return result;
  };

  const update = (change: (entries: Map<string, Credentials>) => boolean) =>
    serialize(async () => {
      const entries = await readEntries(path);
      if (change(entries)) await writeEntries(path, entries);
    });

  return {
    get: key => serialize(async () => (await readEntries(path)).get(key)),
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

/** Returns a copy with only the fields of the credentials, or throws when they aren't credentials. */
function toCredentials(value: unknown): Credentials {
  if (!isCredentials(value)) {
    throw new HomeWizardError('invalid', 'The credentials need a host, token and identifier');
  }

  return { host: value.host, token: value.token, identifier: value.identifier };
}

function isCredentials(value: unknown): value is Credentials {
  if (typeof value !== 'object' || value === null) return false;

  const { host, token, identifier } = value as Record<string, unknown>;
  return typeof host === 'string' && typeof token === 'string' && typeof identifier === 'string';
}

async function readEntries(path: string): Promise<Map<string, Credentials>> {
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
  const entries = new Map<string, Credentials>();

  for (const [key, value] of Object.entries(data)) {
    if (!isCredentials(value)) {
      throw new HomeWizardError(
        'storage',
        `The credentials of "${key}" in ${path} need a host, token and identifier`,
        { path },
      );
    }
    entries.set(key, toCredentials(value));
  }

  return entries;
}

async function writeEntries(path: string, entries: Map<string, Credentials>): Promise<void> {
  // Written next to the file and renamed over it, so readers see the old file or the new one, never half of one
  const temporary = `${path}.${randomUUID()}.tmp`;

  try {
    await writeFile(temporary, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw new HomeWizardError('storage', `Couldn't write the credentials file ${path}`, {
      path,
      cause: error,
    });
  }
}
