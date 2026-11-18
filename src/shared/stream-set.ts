import { AsyncQueue } from './async-queue';

/** What feeds one stream: a value, or its end, which throws `error` from the loop when one is given. */
export interface StreamSink<T> {
  push(value: T): void;
  end(error?: unknown): void;
}

export interface StreamSetOptions<T> {
  /** Adds the listeners that feed one stream, and returns a function that removes them. */
  listen: (stream: StreamSink<T>) => () => void;
  /**
   * Runs as each stream opens, after `listen`: start the source here when it isn't running. Returns `true` when this
   * stream calls `release()` as it ends, and `false` when something else owns the source.
   */
  acquire: () => boolean;
  /**
   * Runs as a stream whose `acquire()` returned `true` ends, even while others are open. To stop the source only
   * with the last stream, return from it while other listeners remain.
   */
  release: () => void;
  /** The most values a stream keeps while its loop is busy. Unlimited by default. */
  maxBuffered?: number;
}

/**
 * The streams of one event source, as async iterators for `for await`. Each stream gets its own listeners, which
 * are removed when it ends: at `break`, when `signal` aborts, or at `end()`, which the source calls when it stops.
 * The streams acquire the source as they open, and a stream that acquired it releases it as it ends.
 */
export class StreamSet<T> {
  private readonly streams = new Set<AsyncQueue<T>>();

  constructor(private readonly options: StreamSetOptions<T>) {}

  open({ signal }: { signal?: AbortSignal } = {}): AsyncIterableIterator<T> {
    // An aborted signal ends the stream before it starts
    if (signal?.aborted) return new AsyncQueue<T>({ signal });

    const { listen, acquire, release, maxBuffered } = this.options;
    let acquired = false;

    const queue: AsyncQueue<T> = new AsyncQueue<T>({
      signal,
      maxBuffered,
      onDone: () => {
        this.streams.delete(queue);
        unlisten();

        if (acquired) release();
      },
    });

    this.streams.add(queue);
    const unlisten = listen(queue);
    acquired = acquire();

    return queue;
  }

  /** Ends every open stream, or makes each throw `error`. */
  end(error?: unknown): void {
    for (const stream of [...this.streams]) stream.end(error);
  }
}
