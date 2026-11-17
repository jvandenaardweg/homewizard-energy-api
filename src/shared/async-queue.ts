export interface AsyncQueueOptions {
  /** Runs once, when the iteration ends for any reason, including a `break` in the loop: remove listeners here. */
  onDone?: () => void;
  /** Ends the iteration when it aborts, or straight away when it already has. */
  signal?: AbortSignal;
  /**
   * The most values kept while nobody reads them. When it's full, the oldest value is dropped, so a slow loop
   * gets recent data instead of a growing backlog. Unlimited by default.
   */
  maxBuffered?: number;
}

/**
 * Turns pushed values into an async iterator, for `for await`. Values pushed while nobody waits are buffered.
 * `end()` finishes the iteration once the buffer is read, and `end(error)` throws the error after it.
 */
export class AsyncQueue<T> implements AsyncIterableIterator<T> {
  protected readonly buffer: T[] = [];
  protected readonly waiting: {
    resolve: (result: IteratorResult<T, undefined>) => void;
    reject: (error: unknown) => void;
  }[] = [];
  protected done = false;
  protected error: { value: unknown } | undefined;
  protected readonly options: AsyncQueueOptions;
  protected readonly onAbort = () => this.end();

  constructor(options: AsyncQueueOptions = {}) {
    this.options = options;

    if (options.signal?.aborted) this.end();
    else options.signal?.addEventListener('abort', this.onAbort, { once: true });
  }

  push(value: T): void {
    if (this.done) return;

    const waiter = this.waiting.shift();

    if (waiter) {
      waiter.resolve({ value, done: false });
      return;
    }

    if (this.buffer.length === this.options.maxBuffered) this.buffer.shift();
    this.buffer.push(value);
  }

  next(): Promise<IteratorResult<T, undefined>> {
    if (this.buffer.length) {
      return Promise.resolve({ value: this.buffer.shift() as T, done: false });
    }

    if (this.error) {
      const { value } = this.error;

      this.error = undefined;
      return Promise.reject(value);
    }

    if (this.done) return Promise.resolve({ value: undefined, done: true });

    return new Promise((resolve, reject) => this.waiting.push({ resolve, reject }));
  }

  /** Called by `break` and `return` in a `for await` loop. */
  return(): Promise<IteratorResult<T, undefined>> {
    this.buffer.length = 0;
    this.error = undefined;
    this.end();

    return Promise.resolve({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): this {
    return this;
  }

  /** Finishes the iteration after the buffered values, or throws `error` from it when one is given. */
  end(error?: unknown): void {
    if (this.done) return;

    if (error !== undefined) this.error = { value: error };
    this.done = true;
    this.options.signal?.removeEventListener('abort', this.onAbort);
    this.options.onDone?.();

    // Nothing is buffered while someone waits, so the waiters get the end or the error
    for (const waiter of this.waiting.splice(0)) {
      if (this.error) {
        waiter.reject(this.error.value);
        this.error = undefined;
      } else {
        waiter.resolve({ value: undefined, done: true });
      }
    }
  }
}
