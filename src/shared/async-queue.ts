/**
 * Turns pushed values into an async iterator, for `for await`. Values pushed while nobody waits are buffered.
 * `end()` finishes the iteration once the buffer is read, and `fail()` throws an error after it. `onDone` runs
 * once, when the iteration ends for any reason, including a `break` in the loop: use it to remove listeners.
 */
export class AsyncQueue<T> implements AsyncIterableIterator<T> {
  protected readonly buffer: T[] = [];
  protected readonly waiting: {
    resolve: (result: IteratorResult<T, undefined>) => void;
    reject: (error: unknown) => void;
  }[] = [];
  protected done = false;
  protected error: { value: unknown } | undefined;

  constructor(protected readonly onDone: () => void = () => undefined) {}

  push(value: T): void {
    if (this.done) return;

    const waiter = this.waiting.shift();

    if (waiter) waiter.resolve({ value, done: false });
    else this.buffer.push(value);
  }

  /** Finishes the iteration after the buffered values. */
  end(): void {
    this.finish();
  }

  /** Throws `error` from the iteration after the buffered values. */
  fail(error: unknown): void {
    if (this.done) return;

    this.error = { value: error };
    this.finish();
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
    this.finish();

    return Promise.resolve({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): this {
    return this;
  }

  protected finish(): void {
    if (this.done) return;

    this.done = true;
    this.onDone();

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
