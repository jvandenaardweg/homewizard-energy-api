import { EventEmitter } from 'events';
import { Dispatcher, WebSocket } from 'undici';
import { AsyncQueue } from '@/shared/async-queue';
import { log, LoggerOptions, redact } from '@/shared/logger';
import { HomeWizardError } from './errors';
import { Batteries, DeviceInformation, User } from './types';

/**
 * The data of each WebSocket topic: the same as the response of its endpoint.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/websocket#subscribe
 */
export interface CommonTopics<TMeasurement, TSystem> {
  device: DeviceInformation;
  user: User[];
  measurement: TMeasurement;
  /** Only `cloud_enabled` and `status_led_brightness_pct` are pushed when they change. */
  system: TSystem;
}

export interface BatteriesTopic {
  /** Only `mode`, `permissions` and `target_power_w` are pushed when they change. */
  batteries: Batteries;
}

export interface WebSocketOptions {
  /** Connect again after the connection drops. Defaults to `true`. */
  reconnect?: boolean;
  /** The first delay before connecting again, in milliseconds. It doubles after each failed attempt. Defaults to `1000`. */
  reconnectDelay?: number;
  /** The longest delay before connecting again, in milliseconds. Defaults to `30000`. */
  maxReconnectDelay?: number;
  /**
   * When nothing arrives for this long, in milliseconds, the socket asks the device for its information. When
   * nothing arrives for twice as long, the connection is treated as dead and reconnected. Defaults to `30000`.
   * Set to `0` to disable it.
   */
  heartbeatInterval?: number;
}

export interface StreamOptions {
  /** Ends the stream, like a `break` in the loop. */
  signal?: AbortSignal;
}

/** @internal */
export interface DeviceSocketConnection {
  url: string;
  token: string | undefined;
  dispatcher: Dispatcher;
  logger: LoggerOptions | undefined;
}

/** After this many drops in a row between sending the token and `authorized`, the token counts as rejected. */
const REJECTED_TOKEN_DROPS = 2;

const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;

interface Message {
  type: string;
  data?: unknown;
}

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
  protected socket: WebSocket | null = null;
  protected authorized = false;
  protected authorizationSent = false;
  /** Connections in a row that the device dropped after the token was sent, before it authorized. */
  protected droppedAfterToken = 0;
  /** `true` once the socket stopped for good: `close()`, a missing or rejected token, or a drop without reconnect. */
  protected stopped = false;
  /** The error the socket stopped for: a missing or rejected token. */
  protected stopError: HomeWizardError | undefined;
  /** The running `stream()` iterators, which end when the socket stops. */
  protected readonly streams = new Set<Pick<AsyncQueue<unknown>, 'end'>>();
  /** The topics a `stream()` subscribed to, which it unsubscribes when the last listener stops. */
  protected readonly streamSubscriptions = new Set<string>();
  protected reconnectAttempt = 0;
  protected reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  protected heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  protected lastMessageAt = 0;
  protected heartbeatPending = false;
  protected readonly options: Required<WebSocketOptions>;

  constructor(
    protected readonly connection: DeviceSocketConnection,
    options: WebSocketOptions = {},
  ) {
    this.options = {
      reconnect: options.reconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY,
      maxReconnectDelay: options.maxReconnectDelay ?? DEFAULT_MAX_RECONNECT_DELAY,
      heartbeatInterval: options.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL,
    };

    // An "error" event without a listener would throw, and crash the process from a socket callback
    this.emitter.on('error', () => undefined);
  }

  /** `true` while the connection is open and the device accepted the token. */
  get isAuthorized(): boolean {
    return this.authorized;
  }

  protected log(...args: unknown[]): void {
    log(this.connection.logger, ...args);
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
    if (this.socket) return;

    this.stopped = false;
    this.stopError = undefined;
    this.authorizationSent = false;
    clearTimeout(this.reconnectTimer);

    this.log(`Connecting to ${this.connection.url}`);

    const socket = new WebSocket(this.connection.url, { dispatcher: this.connection.dispatcher });
    this.socket = socket;

    socket.onmessage = event => {
      if (this.socket === socket) this.handleMessage(event.data);
    };
    socket.onerror = event => {
      if (this.socket !== socket) return;

      const cause = (event as unknown as { error?: unknown }).error;
      const detail = cause instanceof Error && cause.message ? `: ${cause.message}` : '';
      this.emitter.emit(
        'error',
        new HomeWizardError('socket', `The WebSocket connection failed${detail}`, { cause }),
      );
    };
    socket.onclose = event => {
      if (this.socket === socket) this.handleClose(event.code, event.reason);
    };
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
    this.stopHeartbeat();

    const { socket } = this;
    this.socket = null;
    this.authorized = false;

    if (error) this.emitter.emit('error', error);

    if (socket) {
      socket.close(1000);
      this.emitter.emit('close', 1000, 'closed');
    }

    for (const stream of [...this.streams]) {
      stream.end(error);
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
    const { signal } = options;

    // An aborted signal ends the stream before it starts
    if (signal?.aborted) return new AsyncQueue({ signal });

    const onData = (data: TTopics[K]) => queue.push(data);

    const queue: AsyncQueue<TTopics[K]> = new AsyncQueue<TTopics[K]>({
      signal,
      // Every topic is state: a slow loop only needs the latest
      maxBuffered: 1,
      onDone: () => {
        this.streams.delete(queue);
        this.off(topic, onData);

        if (this.streamSubscriptions.has(topic) && this.emitter.listenerCount(topic) === 0) {
          this.streamSubscriptions.delete(topic);
          this.unsubscribe(topic);
        }
      },
    });

    // A socket that stopped emits no more events, so the stream ends straight away
    if (this.stopped) {
      queue.end(this.stopError);
      return queue;
    }

    this.streams.add(queue);
    this.on(topic, onData);

    if (!this.subscriptions.has(topic) && !this.subscriptions.has('*')) {
      this.streamSubscriptions.add(topic);
      this.subscribe(topic);
    }

    return queue;
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
    if (this.socket && this.authorized) {
      this.write(message);
      return;
    }

    if (!isSubscription) this.queue.push(message);
  }

  protected write(message: Message): void {
    this.log(`Sending ${redact(message)}`);
    this.socket?.send(JSON.stringify(message));
  }

  protected handleMessage(raw: unknown): void {
    this.lastMessageAt = Date.now();

    let message: Message;

    try {
      message = JSON.parse(String(raw)) as Message;
    } catch {
      this.emitter.emit(
        'error',
        new HomeWizardError('socket', `Received a message that is not JSON: ${String(raw)}`),
      );
      return;
    }

    this.log(`Received ${message.type}`);
    this.emitter.emit('message', message);

    switch (message.type) {
      case 'authorization_requested':
        return this.authorize();
      case 'authorized':
        return this.handleAuthorized();
      case 'error':
        return this.handleDeviceError(message.data);
      default:
        if (message.type === 'device' && this.heartbeatPending) {
          this.heartbeatPending = false;

          // The answer to a heartbeat, which the user didn't ask for
          if (!this.subscriptions.has('device' as keyof TTopics) && !this.subscriptions.has('*')) {
            return;
          }
        }

        this.emitter.emit(message.type, message.data);
    }
  }

  protected authorize(): void {
    const { token } = this.connection;

    if (!token) {
      this.stop(
        new HomeWizardError(
          'socket',
          'The device asks for a token, but there is none. Pair first, and pass the token.',
          { code: 'user:unauthorized' },
        ),
      );
      return;
    }

    // Not logged: the message has the token
    this.socket?.send(JSON.stringify({ type: 'authorization', data: token }));
    this.authorizationSent = true;
  }

  protected handleAuthorized(): void {
    this.authorized = true;
    this.reconnectAttempt = 0;

    for (const topic of this.subscriptions) {
      this.write({ type: 'subscribe', data: topic });
    }

    for (const message of this.queue.splice(0)) {
      this.write(message);
    }

    this.startHeartbeat();
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

  protected handleClose(code: number, reason: string): void {
    this.log(`Connection closed (${code}${reason ? `: ${reason}` : ''})`);

    // The device drops the connection without an error message when the token is wrong. A network drop in that
    // moment looks the same, so only two in a row count as a rejected token.
    if (this.authorizationSent && !this.authorized) {
      this.droppedAfterToken++;
    } else {
      this.droppedAfterToken = 0;
    }

    this.socket = null;
    this.authorized = false;
    this.stopHeartbeat();

    if (this.droppedAfterToken >= REJECTED_TOKEN_DROPS) {
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

    const delay = Math.min(
      this.options.maxReconnectDelay,
      this.options.reconnectDelay * 2 ** this.reconnectAttempt,
    );
    this.reconnectAttempt++;

    this.log(`Reconnecting in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  protected startHeartbeat(): void {
    const { heartbeatInterval } = this.options;

    if (!heartbeatInterval) return;

    this.stopHeartbeat();
    this.lastMessageAt = Date.now();

    this.heartbeatTimer = setInterval(() => {
      const silentFor = Date.now() - this.lastMessageAt;

      if (silentFor >= heartbeatInterval * 2) {
        this.log(`Nothing received for ${silentFor}ms, reconnecting`);
        this.dropConnection();
        return;
      }

      if (silentFor >= heartbeatInterval && !this.heartbeatPending) {
        this.heartbeatPending = true;
        this.write({ type: 'device' });
      }
      // Checking twice per interval sends the heartbeat well before the connection counts as dead
    }, heartbeatInterval / 2);
  }

  protected stopHeartbeat(): void {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    this.heartbeatPending = false;
  }

  /** Treats the connection as dead: closes it and reconnects, without waiting for a close handshake. */
  protected dropConnection(): void {
    // The heartbeat only runs while connected, so there is a socket
    (this.socket as WebSocket).close();

    this.handleClose(1006, 'no response');
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
