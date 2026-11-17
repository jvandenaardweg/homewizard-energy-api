/** Resolves after `ms` milliseconds, or as soon as `signal` aborts. */
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);

    signal?.addEventListener('abort', done, { once: true });
  });
}
