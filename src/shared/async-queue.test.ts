import { AsyncQueue } from './async-queue';

describe('shared/AsyncQueue', () => {
  it('should yield buffered and later values in order, then end', async () => {
    const queue = new AsyncQueue<number>();
    queue.push(1);

    const values: number[] = [];
    const loop = (async () => {
      for await (const value of queue) values.push(value);
    })();

    await Promise.resolve();
    queue.push(2);
    queue.end();
    queue.push(3);
    await loop;

    expect(values).toStrictEqual([1, 2]);
  });

  it('should throw the error after the buffered values, once', async () => {
    const queue = new AsyncQueue<number>();
    const error = new Error('failed');
    queue.push(1);
    queue.fail(error);
    queue.fail(new Error('ignored'));

    await expect(queue.next()).resolves.toStrictEqual({ value: 1, done: false });
    await expect(queue.next()).rejects.toBe(error);
    await expect(queue.next()).resolves.toStrictEqual({ value: undefined, done: true });
  });

  it('should reject a waiting next() with the error', async () => {
    const queue = new AsyncQueue<number>();
    const next = queue.next();
    const error = new Error('failed');

    queue.fail(error);

    await expect(next).rejects.toBe(error);
  });

  it('should keep only the newest values up to maxBuffered', async () => {
    const queue = new AsyncQueue<number>({ maxBuffered: 2 });
    queue.push(1);
    queue.push(2);
    queue.push(3);
    queue.end();

    const values: number[] = [];
    for await (const value of queue) values.push(value);

    expect(values).toStrictEqual([2, 3]);
  });

  it('should end when the signal aborts, or straight away when it was aborted already', async () => {
    const controller = new AbortController();
    const onDone = vi.fn();
    const queue = new AsyncQueue<number>({ signal: controller.signal, onDone });
    const next = queue.next();

    controller.abort();

    await expect(next).resolves.toStrictEqual({ value: undefined, done: true });
    expect(onDone).toHaveBeenCalledTimes(1);
    await expect(
      new AsyncQueue<number>({ signal: AbortSignal.abort() }).next(),
    ).resolves.toStrictEqual({ value: undefined, done: true });
  });

  it('should run onDone once, on a break, and drop what is buffered', async () => {
    const onDone = vi.fn();
    const queue = new AsyncQueue<number>({ onDone });
    queue.push(1);
    queue.push(2);

    for await (const value of queue) {
      expect(value).toBe(1);
      break;
    }
    queue.end();

    expect(onDone).toHaveBeenCalledTimes(1);
    await expect(queue.next()).resolves.toStrictEqual({ value: undefined, done: true });
  });
});
