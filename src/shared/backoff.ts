/**
 * The delays of an exponential backoff: the first delay, then double each time, up to a maximum.
 *
 * @example
 * const backoff = new Backoff(1000, 30000);
 * backoff.next(); // 1000
 * backoff.next(); // 2000
 * backoff.reset();
 * backoff.next(); // 1000
 */
export class Backoff {
  protected attempt = 0;

  /**
   * @param first The first delay, in milliseconds.
   * @param max The longest delay, in milliseconds. Unlimited by default.
   */
  constructor(
    protected readonly first: number,
    protected readonly max = Infinity,
  ) {}

  /** Returns the next delay, in milliseconds. */
  next(): number {
    return Math.min(this.max, this.first * 2 ** this.attempt++);
  }

  /** Starts again at the first delay, after a success. */
  reset(): void {
    this.attempt = 0;
  }
}
