import { DEFAULT_POLL_INTERVAL, PollRun, PollRunOptions } from './poller';

/** Lets pending promise callbacks run, because the fake timers don't advance them. */
async function flushPromises() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function createRun(options: Partial<PollRunOptions> = {}) {
  const emit = vi.fn<PollRunOptions['emit']>();
  const log = vi.fn();
  const call = vi.fn<() => Promise<unknown>>().mockResolvedValue('ok');
  const run: PollRun = new PollRun({
    name: 'getData',
    call,
    stop: () => run.stop(),
    emit,
    log,
    ...options,
  });

  return { run, emit, log, call };
}

describe('PollRun', () => {
  it('should call and emit at the interval until stop()', async () => {
    const { run, emit, call } = createRun({ interval: 500 });

    const loop = run.start();
    await flushPromises();

    expect(call).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith('response', 'ok');

    await vi.advanceTimersByTimeAsync(500);
    expect(call).toHaveBeenCalledTimes(2);

    run.stop();
    await vi.advanceTimersByTimeAsync(500);
    await loop;

    expect(call).toHaveBeenCalledTimes(2);
  });

  it('should wait the default interval without one', async () => {
    const { run, call } = createRun();

    void run.start();
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_INTERVAL - 1);
    expect(call).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    expect(call).toHaveBeenCalledTimes(2);

    run.stop();
  });

  it('should return the same loop when start() is called again', async () => {
    const { run, call } = createRun();

    const loop = run.start();

    expect(run.start()).toBe(loop);
    expect(call).toHaveBeenCalledOnce();

    run.stop();
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_INTERVAL);
    await loop;
  });

  it('should end once isActive() returns false, after the wait', async () => {
    let active = true;
    const { run, emit, call } = createRun({ interval: 500, isActive: () => active });

    const loop = run.start();
    await flushPromises();

    active = false;
    await vi.advanceTimersByTimeAsync(500);
    await loop;

    expect(call).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledOnce();
  });

  it('should not emit a result that arrives once isActive() returns false', async () => {
    let active = true;
    const { run, emit, call } = createRun({ isActive: () => active });
    call.mockImplementation(async () => {
      active = false;
      return 'late';
    });

    await run.start();

    expect(emit).not.toHaveBeenCalled();
  });

  it('should not call after stop() before start()', async () => {
    const { run, call } = createRun();

    run.stop();
    await run.start();

    expect(call).not.toHaveBeenCalled();
  });

  it('should not emit a result that arrives after stop()', async () => {
    let settle: (error?: Error) => void = () => undefined;
    const call = vi.fn(
      () => new Promise((resolve, reject) => (settle = e => (e ? reject(e) : resolve('ok')))),
    );

    for (const error of [undefined, new Error('Too late')]) {
      const { run, emit } = createRun({ call });

      const loop = run.start();
      run.stop();
      settle(error);
      await loop;

      expect(emit).not.toHaveBeenCalled();
    }
  });

  it('should call stop before it emits the error with stopOnError', async () => {
    const error = new Error('Request failed');
    const order: string[] = [];
    const { run, emit } = createRun({
      stopOnError: true,
      call: () => Promise.reject(error),
      stop: () => {
        order.push('stop');
        run.stop();
      },
    });
    emit.mockImplementation(event => order.push(event));

    await run.start();

    expect(order).toStrictEqual(['stop', 'error']);
    expect(emit).toHaveBeenCalledWith('error', error);
  });

  it('should keep polling and log when an error listener throws', async () => {
    const { run, emit, log, call } = createRun();
    call.mockRejectedValueOnce(new Error('Request failed'));
    emit.mockImplementationOnce(() => {
      throw new Error('Listener failed');
    });

    const loop = run.start();
    await flushPromises();

    expect(log).toHaveBeenCalledWith(
      'Received error while polling "getData": Error: Request failed',
    );
    expect(log).toHaveBeenCalledWith(
      'An "error" listener for polling "getData" threw: Error: Listener failed',
    );

    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_INTERVAL);
    expect(call).toHaveBeenCalledTimes(2);

    run.stop();
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_INTERVAL);
    await loop;
  });
});
