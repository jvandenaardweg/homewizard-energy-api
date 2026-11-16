import { formatError } from './errors';

/** The default time between polls, in milliseconds. */
export const DEFAULT_POLL_INTERVAL = 1000;

export interface PollLoopOptions {
  /** The name used in log lines, for example the method name. */
  name: string;
  interval: number;
  stopOnError: boolean;
  call: () => Promise<unknown>;
  /** Returns `false` once this run is stopped, or replaced by a new run. */
  isActive: () => boolean;
  stop: () => void;
  emit: (event: 'response' | 'error', payload: unknown) => void;
  log: (...args: unknown[]) => void;
}

/**
 * Calls `call` every `interval` milliseconds until `isActive()` returns `false`, and emits each result.
 *
 * The returned promise never rejects, including when an `error` listener throws.
 */
export async function runPollLoop(options: PollLoopOptions): Promise<void> {
  const { name, interval, stopOnError, call, isActive, stop, emit, log } = options;

  while (isActive()) {
    try {
      const response = await call();

      // Polling may have been stopped while the request was in flight
      if (!isActive()) return;

      log(
        `Received response while polling "${name}". Emitting "response": ${JSON.stringify(response)}`,
      );

      emit('response', response);
    } catch (error) {
      if (!isActive()) return;

      log(`Received error while polling "${name}": ${formatError(error)}`);

      // If the user wants to stop polling on error, we stop polling
      if (stopOnError) {
        stop();
      }

      try {
        emit('error', error);
      } catch (listenerError) {
        // A throwing "error" listener would otherwise reject this promise, which nothing awaits, and crash the process
        log(`An "error" listener for polling "${name}" threw: ${formatError(listenerError)}`);
      }
    }

    if (!isActive()) return;

    log(`Waiting for next polling interval for "${name}"...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
