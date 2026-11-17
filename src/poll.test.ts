import { poll } from './poll';

describe('v2/poll', () => {
  it('should emit each response at the interval', async () => {
    let count = 0;
    const fn = vi.fn(async () => ++count);
    const onResponse = vi.fn();

    const poller = poll(fn, { interval: 500 }).on('response', onResponse);
    poller.start();
    expect(poller.isPolling).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    poller.stop();

    expect(poller.isPolling).toBe(false);
    expect(onResponse.mock.calls).toStrictEqual([[1], [2], [3]]);
  });

  it('should default to an interval of 1000ms', async () => {
    const fn = vi.fn(async () => 'ok');

    const poller = poll(fn);
    poller.start();
    await vi.advanceTimersByTimeAsync(1000);
    poller.stop();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should do nothing when started twice', async () => {
    const fn = vi.fn(async () => 'ok');

    const poller = poll(fn);
    poller.start();
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.stop();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should emit errors and keep polling', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('ok');
    const onError = vi.fn();
    const onResponse = vi.fn();

    const poller = poll(fn).on('error', onError).on('response', onResponse);
    poller.start();
    await vi.advanceTimersByTimeAsync(1000);
    poller.stop();

    expect(onError).toHaveBeenCalledWith(new Error('offline'));
    expect(onResponse).toHaveBeenCalledWith('ok');
  });

  it('should stop after an error with stopOnError', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('offline'));
    const onError = vi.fn();

    const poller = poll(fn, { stopOnError: true }).on('error', onError);
    poller.start();
    await vi.advanceTimersByTimeAsync(3000);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(poller.isPolling).toBe(false);
  });

  it('should log an error without an error listener instead of throwing', async () => {
    const method = vi.fn();
    const fn = vi.fn().mockRejectedValue(new Error('offline'));

    const poller = poll(fn, { stopOnError: true, logger: { method } });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(JSON.stringify(method.mock.calls)).toContain('An \\"error\\" listener for polling');
  });

  it('should remove a listener with off()', async () => {
    const onResponse = vi.fn();

    const poller = poll(async () => 'ok').on('response', onResponse);
    poller.off('response', onResponse).off('error', onResponse);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.stop();

    expect(onResponse).not.toHaveBeenCalled();
  });

  it('should not emit the response of a call that finished after stop()', async () => {
    let resolve: (value: string) => void = () => undefined;
    const onResponse = vi.fn();

    const poller = poll(() => new Promise<string>(r => (resolve = r))).on('response', onResponse);
    poller.start();
    poller.stop();
    resolve('late');
    await vi.advanceTimersByTimeAsync(0);

    expect(onResponse).not.toHaveBeenCalled();
  });

  it('should name the log lines after the function', async () => {
    const method = vi.fn();
    const getMeasurement = async () => 'ok';
    const anonymous = [async () => 'ok'][0];

    const named = poll(getMeasurement, { logger: { method } });
    named.start();
    await vi.advanceTimersByTimeAsync(0);
    named.stop();

    const unnamed = poll(anonymous, { logger: { method } });
    unnamed.start();
    await vi.advanceTimersByTimeAsync(0);
    unnamed.stop();

    const logged = JSON.stringify(method.mock.calls);
    expect(logged).toContain('polling \\"getMeasurement\\"');
    expect(logged).toContain('polling \\"poll\\"');
  });

  describe('stream()', () => {
    it('should start polling, yield each result, and stop at a break', async () => {
      let count = 0;
      const poller = poll(async () => ++count, { interval: 500 });
      const values: number[] = [];

      const loop = (async () => {
        for await (const value of poller.stream()) {
          values.push(value);
          if (value === 3) break;
        }
      })();
      await vi.advanceTimersByTimeAsync(1000);
      await loop;

      expect(values).toStrictEqual([1, 2, 3]);
      expect(poller.isPolling).toBe(false);
    });

    it('should leave a poller running that it did not start', async () => {
      const poller = poll(async () => 'ok', { interval: 500 });
      poller.start();

      const stream = poller.stream();
      await expect(stream.next()).resolves.toStrictEqual({ value: 'ok', done: false });
      await stream.return?.();

      expect(poller.isPolling).toBe(true);
      poller.stop();
    });

    it('should throw a failed call from the loop, and stop polling', async () => {
      const error = new Error('offline');
      const poller = poll(async () => {
        throw error;
      });

      await expect(poller.stream().next()).rejects.toBe(error);
      expect(poller.isPolling).toBe(false);
    });

    it('should end at stop(), and when the signal aborts or was aborted already', async () => {
      const poller = poll(() => new Promise<string>(() => undefined));
      const controller = new AbortController();

      const stopped = poller.stream().next();
      poller.stop();
      await expect(stopped).resolves.toStrictEqual({ value: undefined, done: true });

      const aborted = poller.stream({ signal: controller.signal }).next();
      controller.abort();
      await expect(aborted).resolves.toStrictEqual({ value: undefined, done: true });
      expect(poller.isPolling).toBe(false);

      await expect(poller.stream({ signal: AbortSignal.abort() }).next()).resolves.toStrictEqual({
        value: undefined,
        done: true,
      });
      expect(poller.isPolling).toBe(false);
    });
  });
});
