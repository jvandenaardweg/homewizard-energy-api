import { formatError } from './errors';
import { wait } from './wait';

/** The default time between polls, in milliseconds. */
export const DEFAULT_POLL_INTERVAL = 1000;

export interface PollRunOptions {
  /** The name used in log lines, for example the method name. */
  name: string;
  /** The time between polls in milliseconds. Defaults to `DEFAULT_POLL_INTERVAL`. */
  interval?: number;
  /** Calls `stop` after the first error. Defaults to `false`. */
  stopOnError?: boolean;
  call: () => Promise<unknown>;
  /** Returns `false` once this run is stopped from outside, which ends it as `stop()` does, without ending the wait. */
  isActive?: () => boolean;
  /** Stops polling after an error with `stopOnError`, before the error is emitted. It must stop this run. */
  stop: () => void;
  emit: (event: 'response' | 'error', payload: unknown) => void;
  log: (...args: unknown[]) => void;
}

/**
 * One run of polling: from `start()` it calls `call` every `interval` milliseconds and emits each result, until
 * `stop()`. A stopped run doesn't start again: each start of polling gets a new run, so a loop from before a stop
 * can't continue after a quick start again.
 */
export class PollRun {
  readonly #options: PollRunOptions;
  readonly #stopped = new AbortController();
  #loop: Promise<void> | undefined;

  constructor(options: PollRunOptions) {
    this.#options = options;
  }

  /**
   * Starts the loop, and returns its promise, which resolves once the run is stopped. Calling it again returns the
   * same promise. The promise never rejects, including when an `error` listener throws.
   */
  start(): Promise<void> {
    this.#loop ??= this.#run();

    return this.#loop;
  }

  /** Stops the loop. A call in flight finishes, but its result isn't emitted. */
  stop(): void {
    this.#stopped.abort();
  }

  get #isActive(): boolean {
    return !this.#stopped.signal.aborted && (this.#options.isActive?.() ?? true);
  }

  async #run(): Promise<void> {
    const { name, call, stop, emit, log } = this.#options;
    const interval = this.#options.interval || DEFAULT_POLL_INTERVAL;

    while (this.#isActive) {
      try {
        const response = await call();

        // Polling may have been stopped while the request was in flight
        if (!this.#isActive) return;

        log(
          `Received response while polling "${name}". Emitting "response": ${JSON.stringify(response)}`,
        );

        emit('response', response);
      } catch (error) {
        if (!this.#isActive) return;

        log(`Received error while polling "${name}": ${formatError(error)}`);

        // If the user wants to stop polling on error, we stop polling
        if (this.#options.stopOnError) {
          stop();
        }

        try {
          emit('error', error);
        } catch (listenerError) {
          // A throwing "error" listener would otherwise reject this promise, which nothing awaits, and crash the process
          log(`An "error" listener for polling "${name}" threw: ${formatError(listenerError)}`);
        }
      }

      if (!this.#isActive) return;

      log(`Waiting for next polling interval for "${name}"...`);
      // stop() ends the wait, so no timer is left behind
      await wait(interval, this.#stopped.signal);
    }
  }
}
