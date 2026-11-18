import { EventEmitter } from 'events';
import { AsyncQueue } from '@/shared/async-queue';
import { Backoff } from '@/shared/backoff';
import { log } from '@/shared/logger';
import { StreamSet } from '@/shared/stream-set';
import { HomeWizardError } from '../errors';
import {
  Connection,
  ConnectionClass,
  ConnectionClose,
  ConnectionHandlers,
  MessageKind,
  SocketConnection,
} from './connection';
import { Message, SocketTarget, StreamOptions, WebSocketOptions } from './types';

/** After this many drops in a row between sending the token and `authorized`, the token counts as rejected. */
const REJECTED_TOKEN_DROPS = 2;

const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;

/**
 * The WebSocket of a device: it pushes the data of the topics you subscribe to when it changes, so there's no
 * need to poll. It authorizes with the token, subscribes again after a reconnect, and reconnects with backoff.
 *
 * Commands sent before the connection is authorized wait until it is.
 *
 * @example
 * const socket = p1.openWebSocket();
 * socket.on('measurement', measurement => console.log(measurement.power_w));
 * socket.on('error', error => console.error(error));
 * socket.subscribe('measurement');
 *
 * @example
 * // Or as an async iterator, which subscribes for you
 * for await (const measurement of p1.openWebSocket().stream('measurement')) {
 *   console.log(measurement.power_w);
 * }
 *
 * `TUpdates` holds the writable settings per topic, so `set()` only takes what the device lets you change.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/websocket
 */
export class DeviceSocket<TTopics extends object, TUpdates extends object = object> {
  protected readonly emitter = new EventEmitter();
  protected readonly subscriptions = new Set<keyof TTopics | '*'>();
  protected readonly queue: Message[] = [];
  /** The open connection. A new one replaces it on each (re)connect. */
  protected connection: SocketConnection | null = null;
  /** Connections in a row that the device dropped after the token was sent, before it authorized. */
  protected droppedAfterToken = 0;
  /** `true` once the socket stopped for good: `close()`, a missing or rejected token, or a drop without reconnect. */
  protected stopped = false;
  /** The error the socket stopped for: a missing or rejected token. */
  protected stopError: HomeWizardError | undefined;
  /** The `stream()` iterators of each topic, which end when the socket stops. */
  private readonly topicStreams = new Map<string, StreamSet<unknown>>();
  /** The topics a `stream()` subscribed to, which it unsubscribes when the last listener stops. */
  private readonly streamSubscriptions = new Set<string>();
  protected reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly reconnectBackoff: Backoff;
  /** The connection class `connect()` opens. The tests replace it with a fake. */
  protected readonly connectionClass: ConnectionClass = Connection;
  protected readonly connectionHandlers: ConnectionHandlers;
  protected readonly options: Required<WebSocketOptions>;

  constructor(
    protected readonly target: SocketTarget,
    options: WebSocketOptions = {},
  ) {
    this.options = {
      reconnect: options.reconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY,
      maxReconnectDelay: options.maxReconnectDelay ?? DEFAULT_MAX_RECONNECT_DELAY,
      heartbeatInterval: options.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL,
    };

    this.reconnectBackoff = new Backoff(
      this.options.reconnectDelay,
      this.options.maxReconnectDelay,
    );
    this.connectionHandlers = {
      onMessage: (message, kind) => this.handleMessage(message, kind),
      onAuthorized: () => this.handleAuthorized(),
      onError: error => this.emitter.emit('error', error),
      onClose: close => this.handleClose(close),
    };

    // An "error" event without a listener would throw, and crash the process from a socket callback
    this.emitter.on('error', () => undefined);
  }

  /** `true` while the connection is open and the device accepted the token. */
  get isAuthorized(): boolean {
    return this.connection?.isAuthorized ?? false;
  }

  protected log(...args: unknown[]): void {
    log(this.target.logger, ...args);
  }

  /** Data of a topic you subscribed to. */
  on<K extends keyof TTopics & string>(event: K, listener: (data: TTopics[K]) => void): this;
  /** The device accepted the token. Subscriptions were sent again. */
  on(event: 'authorized', listener: () => void): this;
  /** The connection closed. With `reconnect`, a new connection follows. */
  on(event: 'close', listener: (code: number, reason: string) => void): this;
  /** A connection error, or an error message from the device (with its `code`). */
  on(event: 'error', listener: (error: HomeWizardError) => void): this;
  /** Every message from the device, including the ones above. */
  on(event: 'message', listener: (message: Message) => void): this;
  // oxlint-disable-next-line typescript/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  off(event: string, listener: (...args: any[]) => void): this {
    this.emitter.off(event, listener);
    return this;
  }

  /** Connects. Called by `openWebSocket()`, and does nothing while connected or connecting. */
  connect(): void {
    if (this.connection) return;

    this.stopped = false;
    this.stopError = undefined;
    clearTimeout(this.reconnectTimer);

    this.connection = new this.connectionClass(
      this.target,
      this.options.heartbeatInterval,
      this.connectionHandlers,
    );
  }

  /** Closes the connection, without reconnecting. */
  close(): void {
    this.stop();
  }

  /**
   * Stops for good, without reconnecting: the one place the socket gives up. It emits `error` first, when there is
   * one, closes the connection, and ends every `stream()`, or makes it throw `error`.
   */
  protected stop(error?: HomeWizardError): void {
    this.stopped = true;
    this.stopError = error;
    clearTimeout(this.reconnectTimer);

    const { connection } = this;
    this.connection = null;

    if (error) this.emitter.emit('error', error);

    if (connection) {
      connection.close(1000);
      this.emitter.emit('close', 1000, 'closed');
    }

    for (const streams of this.topicStreams.values()) {
      streams.end(error);
    }
  }

  /**
   * Returns the data of a topic as an async iterator, for `for await`. It subscribes to the topic when you
   * haven't, and unsubscribes when the loop ends and nothing else listens to it.
   *
   * The stream keeps going while the socket reconnects. It ends when you `break` the loop, `signal` aborts, or
   * the socket closes for good (`close()`, or a drop with `reconnect: false`). It throws a `HomeWizardError`
   * when the token is missing or rejected. A loop that falls behind gets the latest data, not a backlog.
   *
   * @example
   * for await (const measurement of socket.stream('measurement')) {
   *   console.log(measurement.power_w);
   * }
   */
  stream<K extends keyof TTopics & string>(
    topic: K,
    options: StreamOptions = {},
  ): AsyncIterableIterator<TTopics[K]> {
    // A socket that stopped emits no more events, so the stream ends straight away. An aborted signal ends it first
    if (this.stopped) {
      const queue = new AsyncQueue<TTopics[K]>({ signal: options.signal });

      queue.end(this.stopError);
      return queue;
    }

    return this.streamsOf(topic).open(options);
  }

  /** The streams of a topic: the first subscribes, when you haven't, and the last unsubscribes. */
  private streamsOf<K extends keyof TTopics & string>(topic: K): StreamSet<TTopics[K]> {
    let streams = this.topicStreams.get(topic) as StreamSet<TTopics[K]> | undefined;

    if (!streams) {
      streams = new StreamSet<TTopics[K]>({
        // Every topic is state: a slow loop only needs the latest
        maxBuffered: 1,
        listen: stream => {
          const onData = (data: TTopics[K]) => stream.push(data);

          this.on(topic, onData);
          return () => this.off(topic, onData);
        },
        acquire: () => {
          if (!this.subscriptions.has(topic) && !this.subscriptions.has('*')) {
            this.streamSubscriptions.add(topic);
            this.subscribe(topic);
          }

          // Every stream on a subscription a stream made releases it, and the last one unsubscribes
          return this.streamSubscriptions.has(topic);
        },
        release: () => {
          // Another stream, or a listener of on(), still uses the subscription
          if (this.emitter.listenerCount(topic) > 0) return;

          this.streamSubscriptions.delete(topic);
          this.unsubscribe(topic);
        },
      });
      this.topicStreams.set(topic, streams as StreamSet<unknown>);
    }

    return streams;
  }

  /** Subscribes to a topic, or to all with `*`. The device sends the current data, then each change. */
  subscribe(topic: (keyof TTopics & string) | '*'): void {
    this.subscriptions.add(topic);
    this.send({ type: 'subscribe', data: topic }, true);
  }

  unsubscribe(topic: (keyof TTopics & string) | '*'): void {
    this.subscriptions.delete(topic);
    this.send({ type: 'unsubscribe', data: topic }, true);
  }

  /** Asks the device for the current data of a topic once. It arrives as the event of that topic. */
  request(topic: keyof TTopics & string): void {
    this.send({ type: topic });
  }

  /**
   * Changes writable settings over the WebSocket, with the same fields as the device's `updateSystem()` and
   * `updateBatteries()`. The new data arrives as the event of that topic.
   */
  set<K extends keyof TUpdates & string>(topic: K, data: TUpdates[K]): void {
    this.send({ type: topic, data });
  }

  /**
   * Sends a message, or queues it until the connection is authorized. Subscriptions are not queued: they are all
   * sent on each authorization.
   */
  protected send(message: Message, isSubscription = false): void {
    if (this.isAuthorized) {
      this.write(message);
      return;
    }

    if (!isSubscription) this.queue.push(message);
  }

  protected write(message: Message): void {
    this.connection?.send(message);
  }

  /** A message of the open connection. The connection answers the ones of the authorization itself. */
  protected handleMessage(message: Message, kind: MessageKind): void {
    this.emitter.emit('message', message);

    if (kind === 'authorization') return;

    // The answer to a heartbeat is only data when the user subscribed to it
    if (
      kind === 'heartbeat' &&
      !this.subscriptions.has('device' as keyof TTopics) &&
      !this.subscriptions.has('*')
    ) {
      return;
    }

    if (message.type === 'error') this.handleDeviceError(message.data);
    else this.emitter.emit(message.type, message.data);
  }

  protected handleAuthorized(): void {
    this.reconnectBackoff.reset();

    for (const topic of this.subscriptions) {
      this.write({ type: 'subscribe', data: topic });
    }

    for (const message of this.queue.splice(0)) {
      this.write(message);
    }

    this.emitter.emit('authorized');
  }

  protected handleDeviceError(data: unknown): void {
    const code = (data as { message?: string } | undefined)?.message;
    const error = new HomeWizardError(
      'socket',
      `The device sent an error: ${code ?? JSON.stringify(data)}`,
      { code },
    );

    // Reconnecting with the same token won't help
    if (code === 'user:unauthorized') this.stop(error);
    else this.emitter.emit('error', error);
  }

  /** The open connection closed, without `close()`. */
  protected handleClose({ code, reason, cause }: ConnectionClose): void {
    this.log(`Connection closed (${code}${reason ? `: ${reason}` : ''})`);

    this.connection = null;

    // A network drop right after the token looks like a rejected token, so only two in a row count
    this.droppedAfterToken = cause === 'rejected-token' ? this.droppedAfterToken + 1 : 0;

    if (cause === 'missing-token') {
      this.stop(
        new HomeWizardError(
          'socket',
          'The device asks for a token, but there is none. Pair first, and pass the token.',
          { code: 'user:unauthorized' },
        ),
      );
    } else if (this.droppedAfterToken >= REJECTED_TOKEN_DROPS) {
      this.stop(
        new HomeWizardError(
          'socket',
          'The device closed the connection after the token was sent, so the token is probably invalid',
          { code: 'user:unauthorized' },
        ),
      );
    }

    this.emitter.emit('close', code, reason);

    if (!this.stopped && !this.options.reconnect) this.stop();
    if (this.stopped) return;

    const delay = this.reconnectBackoff.next();

    this.log(`Reconnecting in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

/**
 * The WebSocket of a device with a status LED it can blink: the P1 Meter and the Plug-In Battery.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/websocket#identify
 */
export class IdentifiableDeviceSocket<
  TTopics extends object,
  TUpdates extends object = object,
> extends DeviceSocket<TTopics, TUpdates> {
  /** Blinks the status LED of the device. */
  identify(): void {
    this.send({ type: 'identify' });
  }
}
