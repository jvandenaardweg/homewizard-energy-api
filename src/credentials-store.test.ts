import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createFileStore, createMemoryStore } from './credentials-store';
import { HomeWizardError } from './errors';

const p1 = {
  host: '192.168.1.35',
  token: '0123456789ABCDEF0123456789ABCDEF',
  identifier: 'appliance/p1dongle/5c2fafaabbcc',
};

const kwh = {
  host: '192.168.1.36',
  token: 'FEDCBA9876543210FEDCBA9876543210',
  identifier: 'appliance/energymeter/5c2fafddeeff',
};

describe('createMemoryStore', () => {
  it('should get, set and delete credentials per key', async () => {
    const store = createMemoryStore();

    expect(await store.get('p1')).toBeUndefined();

    await store.set('p1', p1);
    await store.set('kwh', kwh);
    expect(await store.get('p1')).toStrictEqual(p1);
    expect(await store.get('kwh')).toStrictEqual(kwh);

    await store.delete('p1');
    await store.delete('missing');
    expect(await store.get('p1')).toBeUndefined();
    expect(await store.get('kwh')).toStrictEqual(kwh);
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
    await store.set('kwh', { ...kwh, extra: true } as never);

    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({ p1, kwh });
    expect(await readFile(path, 'utf8')).toMatch(/^\{\n {2}"p1": \{\n/);
    expect(await store.get('kwh')).toStrictEqual(kwh);
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

    await Promise.all([store.set('p1', p1), store.set('kwh', kwh)]);

    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual({ p1, kwh });
  });

  it('should keep a key such as "__proto__" as a key', async () => {
    const store = createFileStore(path);

    await store.set('__proto__', p1);

    expect(await store.get('__proto__')).toStrictEqual(p1);
    expect(JSON.parse(await readFile(path, 'utf8'))).toStrictEqual(
      JSON.parse(`{"__proto__":${JSON.stringify(p1)}}`),
    );
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
