import { EventEmitter } from 'events';
import { StreamSet } from './stream-set';

/** A source that emits a count at an interval while it runs, like a poller. */
function createSource() {
  const emitter = new EventEmitter();
  let timer: ReturnType<typeof setInterval> | undefined;
  let count = 0;

  const source = {
    emitter,
    get isRunning() {
      return !!timer;
    },
    start() {
      timer ??= setInterval(() => emitter.emit('value', ++count), 100);
    },
    stop() {
      clearInterval(timer);
      timer = undefined;
      streams.end();
    },
    fail(error: Error) {
      emitter.emit('error', error);
    },
  };

  const release = vi.fn(() => source.stop());
  const streams = new StreamSet<number>({
    listen: stream => {
      const onValue = (value: number) => stream.push(value);
      const onError = (error: Error) => stream.end(error);

      emitter.on('value', onValue);
      emitter.on('error', onError);
      return () => {
        emitter.off('value', onValue);
        emitter.off('error', onError);
      };
    },
    acquire: () => {
      const started = !source.isRunning;

      source.start();
      return started;
    },
    release,
  });

  return { source, streams, release };
}

const listeners = (emitter: EventEmitter) =>
  emitter.listenerCount('value') + emitter.listenerCount('error');

describe('shared/StreamSet', () => {
  it('should give every open stream each value, and remove its listeners when it ends', async () => {
    const { source, streams } = createSource();
    const first = streams.open();
    const second = streams.open();

    await vi.advanceTimersByTimeAsync(100);

    await expect(first.next()).resolves.toStrictEqual({ value: 1, done: false });
    await expect(second.next()).resolves.toStrictEqual({ value: 1, done: false });
    expect(listeners(source.emitter)).toBe(4);

    await second.return?.();
    expect(listeners(source.emitter)).toBe(2);
    await first.return?.();
    expect(listeners(source.emitter)).toBe(0);
  });

  it('should keep only the newest values up to maxBuffered', async () => {
    const { source } = createSource();
    const streams = new StreamSet<number>({
      listen: stream => {
        const onValue = (value: number) => stream.push(value);

        source.emitter.on('value', onValue);
        return () => source.emitter.off('value', onValue);
      },
      acquire: () => false,
      release: () => undefined,
      maxBuffered: 1,
    });
    const stream = streams.open();

    source.start();
    await vi.advanceTimersByTimeAsync(300);

    await expect(stream.next()).resolves.toStrictEqual({ value: 3, done: false });
    source.stop();
  });

  it('should release when the stream that acquired ends, which ends the others', async () => {
    const { source, streams, release } = createSource();
    const first = streams.open();
    const second = streams.open();
    const next = second.next();

    await first.return?.();

    expect(release).toHaveBeenCalledTimes(1);
    expect(source.isRunning).toBe(false);
    await expect(next).resolves.toStrictEqual({ value: undefined, done: true });
    expect(listeners(source.emitter)).toBe(0);
  });

  it('should not release when a stream that joined ends', async () => {
    const { source, streams, release } = createSource();
    const first = streams.open();

    await streams.open().return?.();
    expect(release).not.toHaveBeenCalled();
    expect(source.isRunning).toBe(true);

    await first.return?.();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('should acquire again after the release', async () => {
    const { source, streams, release } = createSource();

    await streams.open().return?.();
    const stream = streams.open();
    expect(source.isRunning).toBe(true);

    await stream.return?.();
    expect(release).toHaveBeenCalledTimes(2);
  });

  it('should not release a source that something else started', async () => {
    const { source, streams, release } = createSource();
    source.start();

    await streams.open().return?.();

    expect(release).not.toHaveBeenCalled();
    expect(source.isRunning).toBe(true);
    source.stop();
  });

  it('should end every open stream at end(), or make each throw the error', async () => {
    const { source, streams } = createSource();
    const ended = streams.open().next();
    source.stop();
    await expect(ended).resolves.toStrictEqual({ value: undefined, done: true });

    // Started elsewhere, so ending a stream doesn't stop it and end the other stream first
    source.start();
    const error = new Error('offline');
    const first = streams.open().next();
    const second = streams.open().next();
    streams.end(error);

    await expect(first).rejects.toBe(error);
    await expect(second).rejects.toBe(error);
    expect(listeners(source.emitter)).toBe(0);
    source.stop();
  });

  it('should end a stream that throws an error from the source', async () => {
    const { source, streams } = createSource();
    const next = streams.open().next();
    const error = new Error('offline');

    source.fail(error);

    await expect(next).rejects.toBe(error);
    expect(source.isRunning).toBe(false);
  });

  it('should end a stream when its signal aborts, and release the source', async () => {
    const { source, streams, release } = createSource();
    const controller = new AbortController();
    const other = streams.open();
    const next = streams.open({ signal: controller.signal }).next();

    controller.abort();

    await expect(next).resolves.toStrictEqual({ value: undefined, done: true });
    expect(listeners(source.emitter)).toBe(2);
    expect(release).not.toHaveBeenCalled();

    await other.return?.();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('should end a stream with an aborted signal before it listens or acquires', async () => {
    const { source, streams } = createSource();
    const stream = streams.open({ signal: AbortSignal.abort() });

    await expect(stream.next()).resolves.toStrictEqual({ value: undefined, done: true });
    expect(listeners(source.emitter)).toBe(0);
    expect(source.isRunning).toBe(false);
  });
});
