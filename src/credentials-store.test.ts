import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createFileStore, createMemoryStore } from './credentials-store';
import { HomeWizardError } from './errors';

const p1 = {
  host: '192.168.1.35',
  token: '0123456789ABCDEF0123456789ABCDEF',
  identifier: 'appliance/p1dongle/5c2fafaabbcc',
};

const battery = {
  host: '192.168.1.36',
  token: 'FEDCBA9876543210FEDCBA9876543210',
  identifier: 'appliance/battery/5c2fafddeeff',
};

describe('createMemoryStore', () => {
  it('should get, set and delete credentials per key', async () => {
    const store = createMemoryStore();

    expect(await store.get('p1')).toBeUndefined();

    await store.set('p1', p1);
    await store.set('battery', battery);
    expect(await store.get('p1')).toStrictEqual(p1);
    expect(await store.get('battery')).toStrictEqual(battery);

    await store.delete('p1');
    await store.delete('missing');
    expect(await store.get('p1')).toBeUndefined();
    expect(await store.get('battery')).toStrictEqual(battery);
  });

  it('should store a copy with only the fields of the credentials', async () => {
    const store = createMemoryStore();
    const credentials = { ...p1, extra: true };

    await store.set('p1', credentials);
    credentials.token = 'changed';

    const stored = await store.get('p1');
    expect(stored).toStrictEqual(p1);

    stored!.token = 'changed';
    expect(await store.get('p1')).toStrictEqual(p1);
  });

  it('should throw an invalid error for something that are not credentials', async () => {
    const store = createMemoryStore();

    await expect(store.set('p1', { host: '192.168.1.35' } as never)).rejects.toMatchObject({
      kind: 'invalid',
      message: 'The credentials need a host, token and identifier',
    });
    await expect(store.set('p1', null as never)).rejects.toBeInstanceOf(HomeWizardError);
  });

  it('should refuse an empty host or token, and accept an empty identifier', async () => {
    const store = createMemoryStore();

    await expect(store.set('p1', { ...p1, host: '' })).rejects.toMatchObject({ kind: 'invalid' });
    await expect(store.set('p1', { ...p1, token: '' })).rejects.toMatchObject({ kind: 'invalid' });

    await store.set('p1', { ...p1, identifier: '' });
    expect(await store.get('p1')).toStrictEqual({ ...p1, identifier: '' });
  });
});

describe('createFileStore', () => {
  let directory: string;
  let path: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'homewizard-credentials-'));
    path = join(directory, 'devices.json');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('should return undefined while the file does not exist', async () => {
    expect(await createFileStore(path).get('p1')).toBeUndefined();
    await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('should write the credentials per key as JSON', async () => {
    const store = createFileStore(path);

    await store.set('p1', p1);
    await store.set('battery', { ...battery, extra: true } as never);

    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({ p1, battery });
    expect(await readFile(path, 'utf8')).toMatch(/^\{\n {2}"p1": \{\n/);
    expect(await store.get('battery')).toStrictEqual(battery);
  });

  it('should read the file another store wrote', async () => {
    await createFileStore(path).set('p1', p1);

    expect(await createFileStore(path).get('p1')).toStrictEqual(p1);
  });

  it('should replace and delete credentials', async () => {
    const store = createFileStore(path);

    await store.set('p1', p1);
    await store.set('p1', { ...p1, token: 'NEW' });
    expect(await store.get('p1')).toStrictEqual({ ...p1, token: 'NEW' });

    await store.delete('p1');
    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({});
  });

  it('should not create the file to delete a key', async () => {
    await createFileStore(path).delete('p1');

    await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.skipIf(process.platform === 'win32')(
    'should make the file readable by its owner only',
    async () => {
      await createFileStore(path).set('p1', p1);

      expect((await stat(path)).mode & 0o777).toBe(0o600);
    },
  );

  it('should keep both credentials when they are set at the same time', async () => {
    const store = createFileStore(path);

    await Promise.all([store.set('p1', p1), store.set('battery', battery)]);

    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({ p1, battery });
  });

  it('should keep a key such as "__proto__" as a key', async () => {
    const store = createFileStore(path);

    await store.set('__proto__', p1);

    expect(await store.get('__proto__')).toStrictEqual(p1);
    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual(
      JSON.parse(`{"__proto__":${JSON.stringify(p1)}}`),
    );
  });

  it('should keep both credentials when two stores of the same file set them at the same time', async () => {
    await Promise.all([
      createFileStore(path).set('p1', p1),
      createFileStore(join(directory, '.', 'devices.json')).set('battery', battery),
    ]);

    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({ p1, battery });
  });

  it('should only throw for an invalid entry when its key is read', async () => {
    await writeFile(path, JSON.stringify({ p1, battery: { host: '192.168.1.36' } }));
    const store = createFileStore(path);

    expect(await store.get('p1')).toStrictEqual(p1);
    await expect(store.get('battery')).rejects.toMatchObject({
      kind: 'storage',
      path,
      message: `The credentials of "battery" in ${path} need a host, token and identifier`,
    });
  });

  it('should replace or remove an invalid entry', async () => {
    await writeFile(path, JSON.stringify({ p1, battery: { host: '192.168.1.36' }, other: 1 }));
    const store = createFileStore(path);

    await store.set('battery', battery);
    expect(await store.get('battery')).toStrictEqual(battery);

    await store.delete('other');
    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({ p1, battery });
  });

  it('should keep the fields added to the other entries', async () => {
    await writeFile(path, JSON.stringify({ battery: { ...battery, name: 'Living room' } }));
    const store = createFileStore(path);

    await store.set('p1', p1);

    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({
      battery: { ...battery, name: 'Living room' },
      p1,
    });
    expect(await store.get('battery')).toStrictEqual(battery);
  });

  it.skipIf(process.platform === 'win32')(
    'should replace the file a symbolic link points to, and keep the link',
    async () => {
      const target = join(directory, 'secrets.json');
      await writeFile(target, JSON.stringify({ battery }));
      await symlink(target, path);

      await createFileStore(path).set('p1', p1);

      expect((await lstat(path)).isSymbolicLink()).toBe(true);
      expect(JSON.parse(await readFile(target, 'utf8'))).toStrictEqual({ battery, p1 });
      expect((await readdir(directory)).sort()).toStrictEqual(['devices.json', 'secrets.json']);
    },
  );

  it.skipIf(process.platform === 'win32')(
    "should create the file a symbolic link points to when it doesn't exist yet, and keep the link",
    async () => {
      await mkdir(join(directory, 'secure'));
      const target = join(directory, 'secure', 'devices.json');
      await symlink(target, path);

      await createFileStore(path).set('p1', p1);

      expect((await lstat(path)).isSymbolicLink()).toBe(true);
      expect(JSON.parse(await readFile(target, 'utf8'))).toStrictEqual({ p1 });
    },
  );

  it.skipIf(process.platform === 'win32')(
    'should keep both credentials when a store of a link and one of its file set them at the same time',
    async () => {
      const target = join(directory, 'secrets.json');
      await writeFile(target, '{}');
      await symlink(target, path);

      await Promise.all([
        createFileStore(path).set('p1', p1),
        createFileStore(target).set('battery', battery),
      ]);

      expect(JSON.parse(await readFile(target, 'utf8'))).toStrictEqual({ p1, battery });
    },
  );

  it.skipIf(process.platform === 'win32')(
    'should keep both credentials when stores reach a new file through a linked folder at the same time',
    async () => {
      await mkdir(join(directory, 'real'));
      await symlink(join(directory, 'real'), join(directory, 'linked'));

      await Promise.all([
        createFileStore(join(directory, 'linked', 'devices.json')).set('p1', p1),
        createFileStore(join(directory, 'real', 'devices.json')).set('battery', battery),
      ]);

      expect(
        JSON.parse(await readFile(join(directory, 'real', 'devices.json'), 'utf8')),
      ).toStrictEqual({
        p1,
        battery,
      });
    },
  );

  it.skipIf(process.platform === 'win32')(
    "should throw a storage error when the path can't be resolved, and leave the link",
    async () => {
      const loop = join(directory, 'loop.json');
      await symlink(loop, path);
      await symlink(path, loop);
      const store = createFileStore(path);

      await expect(store.set('p1', p1)).rejects.toMatchObject({
        kind: 'storage',
        path,
        message: `Couldn't resolve the credentials file ${path}`,
        cause: { code: 'ELOOP' },
      });
      await expect(store.get('p1')).rejects.toMatchObject({ kind: 'storage' });
      expect((await lstat(path)).isSymbolicLink()).toBe(true);
    },
  );

  it('should keep using the file it was created for after the working directory changes', async () => {
    const cwd = process.cwd();
    process.chdir(directory);

    try {
      const store = createFileStore('devices.json');
      process.chdir(tmpdir());
      await store.set('p1', p1);
    } finally {
      process.chdir(cwd);
    }

    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({ p1 });
  });

  it.each([
    ['an empty file', ''],
    ['a file with only whitespace', ' \n'],
    ['a file with only a byte order mark', '\uFEFF'],
  ])('should read %s as a file without credentials', async (_name, content) => {
    await writeFile(path, content);
    const store = createFileStore(path);

    expect(await store.get('p1')).toBeUndefined();
    await store.set('p1', p1);
    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({ p1 });
  });

  it('should read a file that starts with a byte order mark', async () => {
    await writeFile(path, `\uFEFF${JSON.stringify({ p1 })}`);

    expect(await createFileStore(path).get('p1')).toStrictEqual(p1);
  });

  it('should throw an invalid error without a path', () => {
    expect(() => createFileStore('')).toThrow(
      expect.objectContaining({ kind: 'invalid' }) as unknown as Error,
    );
    expect(() => createFileStore(undefined as never)).toThrow(HomeWizardError);
  });

  it('should throw an invalid error for something that are not credentials, without touching the file', async () => {
    await writeFile(path, 'not json');

    await expect(
      createFileStore(path).set('p1', { ...p1, token: 1 } as never),
    ).rejects.toMatchObject({ kind: 'invalid' });
  });

  it.each([
    ['invalid JSON', 'not json', "isn't valid JSON"],
    ['an array', '[]', "isn't an object"],
    ['null', 'null', "isn't an object"],
    ['a string', '"p1"', "isn't an object"],
    ['an entry without a token', '{"p1":{"host":"192.168.1.35","identifier":""}}', 'need a host'],
  ])('should throw a storage error for a file with %s', async (_name, content, message) => {
    await writeFile(path, content);

    const error = await createFileStore(path)
      .get('p1')
      .catch((error: unknown) => error);

    expect(error).toBeInstanceOf(HomeWizardError);
    expect(error).toMatchObject({ kind: 'storage', path });
    expect((error as Error).message).toContain(message);
  });

  it('should throw a storage error when the file cannot be read', async () => {
    await mkdir(path);

    const error = await createFileStore(path)
      .get('p1')
      .catch((error: unknown) => error);

    expect(error).toMatchObject({ kind: 'storage', path, cause: { code: 'EISDIR' } });
  });

  it('should throw a storage error when the file cannot be written, and leave no temporary file', async () => {
    const missing = join(directory, 'missing', 'devices.json');

    const error = await createFileStore(missing)
      .set('p1', p1)
      .catch((error: unknown) => error);

    expect(error).toMatchObject({
      kind: 'storage',
      path: missing,
      message: `Couldn't write the credentials file ${missing}`,
      cause: { code: 'ENOENT' },
    });
    expect(await readdir(directory)).toStrictEqual([]);
  });

  it('should keep working after a call failed', async () => {
    await writeFile(path, 'not json');
    const store = createFileStore(path);

    await expect(store.get('p1')).rejects.toMatchObject({ kind: 'storage' });

    await writeFile(path, JSON.stringify({ p1 }));
    expect(await store.get('p1')).toStrictEqual(p1);
  });
});
