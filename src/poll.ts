import { EventEmitter } from 'events';
import { AsyncQueue } from '@/shared/async-queue';
import { log, LoggerOptions } from '@/shared/logger';
import { DEFAULT_POLL_INTERVAL, runPollLoop } from '@/shared/poller';
import type { StreamOptions } from './websocket';

export interface PollOptions {
  /**
   * The time between the end of one call and the start of the next, in milliseconds. Defaults to `1000`.
   * HomeWizard advises not to request data more often than every `500`ms.
   *
   * @link https://api-documentation.homewizard.com/docs/getting-started#data-update-frequency
   */
  interval?: number;
  /** Stop polling after the first error. Defaults to `false`. */
  stopOnError?: boolean;
  logger?: LoggerOptions;
}

export interface Poller<T> {
  /** Starts polling. Does nothing while already polling. */
  start(): void;
  /** Stops polling. A call in flight finishes, but its result isn't emitted. */
  stop(): void;
  /** `true` between `start()` and `stop()`. */
  readonly isPolling: boolean;
  on(event: 'response', listener: (response: T) => void): this;
  /** Add an `error` listener: errors without one are only logged. */
  on(event: 'error', listener: (error: Error) => void): this;
  off(event: 'response', listener: (response: T) => void): this;
  off(event: 'error', listener: (error: Error) => void): this;
  /**
   * Returns the results as an async iterator, for `for await`. It starts polling when it isn't already, and stops
   * it again when the loop ends. The loop ends at `break`, when `signal` aborts or at `stop()`, and a failed call
   * throws from it. A loop that falls behind gets the latest result, not a backlog.
   *
   * @example
   * for await (const measurement of poll(() => p1.getMeasurement()).stream()) {
   *   console.log(measurement.power_w);
   * }
   */
  stream(options?: StreamOptions): AsyncIterableIterator<T>;
}

/**
 * Calls `fn` at an interval and emits each result. The WebSocket pushes changes without polling, so prefer it
 * where the device supports it.
 *
 * @example
 * const poller = poll(() => p1.getMeasurement(), { interval: 1000 });
 * poller.on('response', measurement => console.log(measurement.power_w));
 * poller.on('error', error => console.error(error));
 * poller.start();
 */
export function poll<T>(fn: () => Promise<T>, options: PollOptions = {}): Poller<T> {
  const emitter = new EventEmitter();
  const name = fn.name || 'poll';
  const streams = new Set<AsyncQueue<T>>();
  let activeRun: object | undefined;

  const poller = {
    start() {
      if (activeRun) return;

      const run = {};
      activeRun = run;

      void runPollLoop({
        name,
        interval: options.interval || DEFAULT_POLL_INTERVAL,
        stopOnError: !!options.stopOnError,
        call: fn,
        isActive: () => activeRun === run,
        stop: () => poller.stop(),
        emit: (event, payload) => emitter.emit(event, payload),
        log: (...args) => log(options.logger, ...args),
      });
    },
    stop() {
      activeRun = undefined;

      for (const stream of [...streams]) stream.end();
    },
    get isPolling() {
      return !!activeRun;
    },
    // oxlint-disable-next-line typescript/no-explicit-any
    on(event: 'response' | 'error', listener: (...args: any[]) => void) {
      emitter.on(event, listener);
      return poller;
    },
    // oxlint-disable-next-line typescript/no-explicit-any
    off(event: 'response' | 'error', listener: (...args: any[]) => void) {
      emitter.off(event, listener);
      return poller;
    },
    stream({ signal }: StreamOptions = {}) {
      // An aborted signal ends the stream before it starts
      if (signal?.aborted) return new AsyncQueue<T>({ signal });

      const startedHere = !activeRun;
      const onResponse = (response: T) => queue.push(response);
      const onError = (error: unknown) => queue.end(error);

      const queue: AsyncQueue<T> = new AsyncQueue<T>({
        signal,
        // Each result replaces the one before: a slow loop only needs the latest
        maxBuffered: 1,
        onDone: () => {
          streams.delete(queue);
          emitter.off('response', onResponse);
          emitter.off('error', onError);

          if (startedHere) poller.stop();
        },
      });

      streams.add(queue);
      emitter.on('response', onResponse);
      emitter.on('error', onError);
      poller.start();

      return queue;
    },
  };

  return poller as Poller<T>;
}
