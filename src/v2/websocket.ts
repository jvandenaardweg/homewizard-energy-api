import { EventEmitter } from 'events';
import { Dispatcher, WebSocket } from 'undici';
import { log, LoggerOptions } from '@/shared/logger';
import { HomeWizardApiV2WebSocketError } from './errors';
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

/** @internal */
export interface DeviceSocketConnection {
  url: string;
  token: string | undefined;
  dispatcher: Dispatcher;
  logger: LoggerOptions | undefined;
}

const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;

interface Message {
  type: string;
  data?: unknown;
}

type WritableTopic<TTopics> = Extract<keyof TTopics, 'system' | 'batteries'>;

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
 * @link https://api-documentation.homewizard.com/docs/v2/websocket
 */
export class DeviceSocket<TTopics extends object> {
  protected readonly emitter = new EventEmitter();
  protected readonly subscriptions = new Set<keyof TTopics | '*'>();
  protected readonly queue: Message[] = [];
  protected socket: WebSocket | null = null;
  protected authorized = false;
  protected authorizationSent = false;
  protected closedByUser = false;
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
  on(event: 'error', listener: (error: Error) => void): this;
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

    this.closedByUser = false;
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
      const error = new HomeWizardApiV2WebSocketError(`The WebSocket connection failed${detail}`);

      error.cause = cause;
      this.emitter.emit('error', error);
    };
    socket.onclose = event => {
      if (this.socket === socket) this.handleClose(event.code, event.reason);
    };
  }

  /** Closes the connection, without reconnecting. */
  close(): void {
    this.closedByUser = true;
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();

    const { socket } = this;
    this.socket = null;
    this.authorized = false;

    if (socket) {
      socket.close(1000);
      this.emitter.emit('close', 1000, 'closed');
    }
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

  /** Changes writable settings over the WebSocket. The new data arrives as the event of that topic. */
  set<K extends WritableTopic<TTopics>>(topic: K, data: Partial<TTopics[K]>): void {
    this.send({ type: topic, data });
  }

  /** Blinks the status LED of the device. */
  identify(): void {
    this.send({ type: 'identify' });
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
    this.log(`Sending ${JSON.stringify(message)}`);
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
        new HomeWizardApiV2WebSocketError(`Received a message that is not JSON: ${String(raw)}`),
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
      this.emitter.emit(
        'error',
        new HomeWizardApiV2WebSocketError(
          'The device asks for a token, but there is none. Pair first, and pass the token.',
          'user:unauthorized',
        ),
      );
      this.close();
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
    const error = new HomeWizardApiV2WebSocketError(
      `The device sent an error: ${code ?? JSON.stringify(data)}`,
      code,
    );

    this.emitter.emit('error', error);

    // Reconnecting with the same token won't help
    if (code === 'user:unauthorized') this.close();
  }

  protected handleClose(code: number, reason: string): void {
    this.log(`Connection closed (${code}${reason ? `: ${reason}` : ''})`);

    const rejectedToken = this.authorizationSent && !this.authorized;

    this.socket = null;
    this.authorized = false;
    this.stopHeartbeat();

    // The device drops the connection without an error message when the token is wrong
    if (rejectedToken) {
      this.closedByUser = true;
      this.emitter.emit(
        'error',
        new HomeWizardApiV2WebSocketError(
          'The device closed the connection after the token was sent, so the token is probably invalid',
          'user:unauthorized',
        ),
      );
    }

    this.emitter.emit('close', code, reason);

    if (this.closedByUser || !this.options.reconnect) return;

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
