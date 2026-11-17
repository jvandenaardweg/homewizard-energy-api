export interface HeartbeatHandlers {
  /** Asks the other side for a sign of life. Called once per silence. */
  ping(): void;
  /** Nothing arrived for two intervals, not even an answer to the ping. */
  onDead(silentForMs: number): void;
}

/**
 * Watches a connection for silence. After one interval without a message it pings once, and after two intervals
 * it reports the connection as dead. undici's WebSocket has no pong event, so the ping is an ordinary request and
 * any message counts as a sign of life.
 */
export class Heartbeat {
  protected timer: ReturnType<typeof setInterval> | undefined;
  protected lastMessageAt = 0;
  protected pending = false;

  /**
   * @param interval The silence, in milliseconds, after which to ping. `0` disables the heartbeat.
   */
  constructor(
    protected readonly interval: number,
    protected readonly handlers: HeartbeatHandlers,
  ) {}

  /** Starts watching, from now. Does nothing when the interval is `0`. */
  start(): void {
    if (!this.interval) return;

    this.stop();
    this.lastMessageAt = Date.now();

    this.timer = setInterval(() => {
      const silentFor = Date.now() - this.lastMessageAt;

      if (silentFor >= this.interval * 2) {
        this.handlers.onDead(silentFor);
        return;
      }

      if (silentFor >= this.interval && !this.pending) {
        this.pending = true;
        this.handlers.ping();
      }
      // Checking twice per interval sends the ping well before the connection counts as dead
    }, this.interval / 2);
  }

  /** Stops watching. */
  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.pending = false;
  }

  /** Records that a message arrived. */
  touch(): void {
    this.lastMessageAt = Date.now();
  }

  /**
   * Returns `true` when a ping is waiting for its answer, and stops waiting for it. Call it for a message that
   * can be that answer, to tell it apart from one the user asked for.
   */
  takeAnswer(): boolean {
    const wasPending = this.pending;

    this.pending = false;

    return wasPending;
  }
}
