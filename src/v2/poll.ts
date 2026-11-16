import { EventEmitter } from 'events';
import { log, LoggerOptions } from '@/shared/logger';
import { runPollLoop } from '@/shared/poller';

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
}

/**
 * Calls `fn` at an interval and emits each result. The WebSocket pushes changes without polling, so prefer it
 * where the device supports it.
 *
 * @example
 * const poller = v2.poll(() => p1.getMeasurement(), { interval: 1000 });
 * poller.on('response', measurement => console.log(measurement.power_w));
 * poller.on('error', error => console.error(error));
 * poller.start();
 */
export function poll<T>(fn: () => Promise<T>, options: PollOptions = {}): Poller<T> {
  const emitter = new EventEmitter();
  const name = fn.name || 'poll';
  let activeRun: object | undefined;

  const poller = {
    start() {
      if (activeRun) return;

      const run = {};
      activeRun = run;

      void runPollLoop({
        name,
        interval: options.interval || 1000,
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
  };

  return poller as Poller<T>;
}
