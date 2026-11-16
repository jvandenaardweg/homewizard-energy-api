import { EventEmitter } from 'events';
import { ConnectionOptions } from 'tls';
import WebSocket from 'ws';
import { LoggerOptions } from '@/base-api';
import { BasicInformationResponse } from '@/types';
import {
  BaseMeasurementResponse,
  BatteriesPutParams,
  BatteriesResponse,
  ErrorCodesV2,
  SystemV2PutParams,
  SystemV2Response,
  UserListResponse,
} from '@/types-v2';

/**
 * The topics of the WebSocket. Use `*` to subscribe to all topics.
 *
 * - `system`: only `cloud_enabled` and `status_led_brightness_pct` are updated in real time
 * - `batteries`: only `mode`, `permissions` and `target_power_w` are updated in real time
 *
 * @link https://api-documentation.homewizard.com/docs/v2/websocket
 */
export type WebSocketTopic = 'device' | 'user' | 'measurement' | 'system' | 'batteries';

export const WebSocketTopics: WebSocketTopic[] = [
  'device',
  'user',
  'measurement',
  'system',
  'batteries',
];

export interface WebSocketMessage {
  type: string;
  data?: unknown;
}

export interface WebSocketOptions {
  /** Connect again when the connection is lost. Defaults to `true`. */
  reconnect?: boolean;
  /** The time in milliseconds to wait before connecting again. Defaults to `5000`. */
  reconnectInterval?: number;
  /**
   * The interval in milliseconds to check if the connection is still alive (ping). Defaults to `30000`, use `0` to disable.
   * The connection is closed (and opened again) when nothing is received during two intervals.
   */
  heartbeatInterval?: number;
}

export interface WebSocketConnectionOptions {
  /** Returns the token to authorize with, requested each time the device asks for authorization. */
  getToken: () => string | undefined;
  /** The TLS options, the same as used for the HTTPS requests. */
  tls?: Pick<ConnectionOptions, 'ca' | 'rejectUnauthorized' | 'checkServerIdentity'>;
  logger?: LoggerOptions;
  websocket?: WebSocketOptions;
}

export class HomeWizardEnergyApiV2WebSocketError extends Error {
  /** The error code of the API v2, for example `request:unknown-subscription`. */
  errorCode?: ErrorCodesV2 | string;

  constructor(message: string, errorCode?: ErrorCodesV2 | string) {
    super(message);
    this.name = 'HomeWizardEnergyApiV2WebSocketError';
    this.errorCode = errorCode;
  }
}

// The device closes the connection when it did not receive the token within 40 seconds.
export const WEBSOCKET_AUTHORIZATION_TIMEOUT = 40000;
export const DEFAULT_WEBSOCKET_RECONNECT_INTERVAL = 5000;
export const DEFAULT_WEBSOCKET_HEARTBEAT_INTERVAL = 30000;

/**
 * The WebSocket of the API v2. The device pushes the data when it changes, so there is no need to poll the device.
 *
 * @example
 * api.websocket.on('measurement', measurement => console.log(measurement));
 * api.websocket.on('error', error => console.log(error));
 * api.websocket.subscribe('measurement');
 * api.websocket.start();
 *
 * @link https://api-documentation.homewizard.com/docs/v2/websocket
 */
export class HomeWizardEnergyWebSocket<
  TMeasurementResponse extends BaseMeasurementResponse = BaseMeasurementResponse,
> {
  protected readonly url: string;
  protected readonly connectionOptions: WebSocketConnectionOptions;
  protected readonly eventEmitter = new EventEmitter();
  protected readonly subscriptions = new Set<WebSocketTopic | '*'>();
  protected socket: WebSocket | null = null;
  protected started = false;
  protected authorized = false;
  protected reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  protected heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  protected lastActivityAt = 0;

  constructor(url: string, connectionOptions: WebSocketConnectionOptions) {
    this.url = url;
    this.connectionOptions = connectionOptions;

    // An "error" event without a listener would throw, we don't want that
    this.eventEmitter.on('error', () => undefined);
  }

  /** `true` when the WebSocket is started (it might still be connecting). */
  get isStarted(): boolean {
    return this.started;
  }

  /** `true` when the connection is open and the device accepted the token. */
  get isAuthorized(): boolean {
    return this.authorized;
  }

  protected log(...args: unknown[]): void {
    const logger = this.connectionOptions.logger;

    if (!logger?.method) return;

    return logger.method(logger.prefix || '[HomeWizard Energy API]:', ...args);
  }

  on(event: 'measurement', listener: (measurement: TMeasurementResponse) => void): this;
  on(event: 'system', listener: (system: SystemV2Response) => void): this;
  on(event: 'batteries', listener: (batteries: BatteriesResponse) => void): this;
  on(event: 'device', listener: (device: BasicInformationResponse) => void): this;
  on(event: 'user', listener: (users: UserListResponse) => void): this;
  /** The connection is open and the device accepted the token, the subscriptions are (re)sent. */
  on(event: 'authorized', listener: () => void): this;
  /** The connection is closed. When `reconnect` is enabled, a new connection is made after the interval. */
  on(event: 'close', listener: (code: number, reason: string) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  /** Every message received from the device. */
  on(event: 'message', listener: (message: WebSocketMessage) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this {
    this.eventEmitter.on(event, listener);

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, listener: (...args: any[]) => void): this {
    this.eventEmitter.off(event, listener);

    return this;
  }

  /** Removes all listeners (of the event). */
  removeAllListeners(event?: string): this {
    // An explicit undefined would only remove the listeners of the event named "undefined"
    if (event) {
      this.eventEmitter.removeAllListeners(event);
    } else {
      this.eventEmitter.removeAllListeners();
    }

    this.eventEmitter.on('error', () => undefined);

    return this;
  }

  /**
   * Opens the connection to the device and authorizes with the token.
   */
  start(): void {
    if (this.started) {
      this.log('WebSocket is already started.');
      return;
    }

    this.started = true;
    this.connect();
  }

  /**
   * Closes the connection to the device, the subscriptions are kept for the next `start()`.
   */
  stop(): void {
    this.started = false;
    this.authorized = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.socket) {
      this.log('Closing WebSocket.');
      // terminate() does not wait for the closing handshake, the device might be gone
      this.socket.terminate();
      this.socket = null;
    }
  }

  /**
   * Subscribe to a topic. The device sends the latest values, and sends an update when the data changes.
   *
   * Can be invoked before `start()`, subscriptions are sent again after a reconnect.
   */
  subscribe(topic: WebSocketTopic | '*'): this {
    this.subscriptions.add(topic);

    if (this.authorized) {
      this.send({ type: 'subscribe', data: topic });
    }

    return this;
  }

  unsubscribe(topic: WebSocketTopic | '*'): this {
    this.subscriptions.delete(topic);

    if (this.authorized) {
      this.send({ type: 'unsubscribe', data: topic });
    }

    return this;
  }

  /**
   * Ask the device to send the latest values of a topic once, they are received in the event of the topic.
   */
  request(topic: WebSocketTopic): void {
    this.send({ type: topic });
  }

  /**
   * Change the system settings, the new values are received in the `system` event.
   */
  updateSystem(params: SystemV2PutParams): void {
    this.send({ type: 'system', data: params });
  }

  /**
   * Control the Plug-In Batteries, the new values are received in the `batteries` event. Only for the `HWE-P1` and the kWh meters.
   */
  updateBatteries(params: BatteriesPutParams): void {
    this.send({ type: 'batteries', data: params });
  }

  /**
   * The status light will blink for a few seconds.
   */
  identify(): void {
    this.send({ type: 'identify' });
  }

  protected send(message: WebSocketMessage): void {
    if (!this.socket || !this.authorized) {
      throw new HomeWizardEnergyApiV2WebSocketError(
        `WebSocket is not authorized (yet), unable to send "${message.type}"`,
      );
    }

    this.log(`Sending WebSocket message: ${JSON.stringify(message)}`);

    this.socket.send(JSON.stringify(message));
  }

  protected connect(): void {
    this.log(`Connecting to WebSocket at ${this.url}`);

    const socket = new WebSocket(this.url, {
      handshakeTimeout: WEBSOCKET_AUTHORIZATION_TIMEOUT,
      // The options are given to tls.connect() of Node, the types of "ws" differ for checkServerIdentity
      ...(this.connectionOptions.tls as WebSocket.ClientOptions | undefined),
    });

    this.socket = socket;
    this.authorized = false;

    socket.on('open', () => {
      this.log('WebSocket connected, waiting for the authorization request...');
      this.lastActivityAt = Date.now();
      this.startHeartbeat();
    });

    socket.on('pong', () => {
      this.lastActivityAt = Date.now();
    });

    socket.on('message', (raw: WebSocket.RawData) => {
      this.lastActivityAt = Date.now();
      this.handleMessage(socket, raw.toString());
    });

    socket.on('error', (error: Error) => {
      this.log(`WebSocket error: ${error}`);
      this.eventEmitter.emit('error', error);
    });

    socket.on('close', (code: number, reason: Buffer) => {
      // An old connection that we replaced or stopped
      if (this.socket !== socket) return;

      this.log(`WebSocket closed (${code})`);
      this.socket = null;
      this.authorized = false;
      this.stopHeartbeat();
      this.eventEmitter.emit('close', code, reason.toString());

      if (this.started && this.connectionOptions.websocket?.reconnect !== false) {
        const interval =
          this.connectionOptions.websocket?.reconnectInterval ||
          DEFAULT_WEBSOCKET_RECONNECT_INTERVAL;

        this.log(`Connecting again in ${interval}ms...`);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          if (this.started) this.connect();
        }, interval);
      } else {
        this.started = false;
      }
    });
  }

  protected handleMessage(socket: WebSocket, text: string): void {
    let message: WebSocketMessage;

    try {
      message = JSON.parse(text) as WebSocketMessage;
    } catch (e) {
      this.eventEmitter.emit(
        'error',
        new HomeWizardEnergyApiV2WebSocketError(`Received an invalid WebSocket message: ${text}`),
      );
      return;
    }

    this.eventEmitter.emit('message', message);

    switch (message.type) {
      case 'authorization_requested': {
        const token = this.connectionOptions.getToken();

        if (!token) {
          this.eventEmitter.emit(
            'error',
            new HomeWizardEnergyApiV2WebSocketError(
              'The device requests authorization, but there is no token. Use pair() or setToken() first.',
              ErrorCodesV2.USER_UNAUTHORIZED,
            ),
          );
          this.stop();
          return;
        }

        // We don't log the token
        this.log('Authorization requested, sending the token.');
        socket.send(JSON.stringify({ type: 'authorization', data: token }));
        break;
      }

      case 'authorized':
        this.log('WebSocket authorized.');
        this.authorized = true;
        this.subscriptions.forEach(topic => this.send({ type: 'subscribe', data: topic }));
        this.eventEmitter.emit('authorized');
        break;

      case 'error': {
        const errorCode = (message.data as { message?: string } | undefined)?.message;

        this.log(`Received WebSocket error: ${errorCode}`);
        this.eventEmitter.emit(
          'error',
          new HomeWizardEnergyApiV2WebSocketError(
            `The device responded with the error: ${errorCode}`,
            errorCode,
          ),
        );

        // The token is not accepted, connecting again will not help
        if (errorCode === ErrorCodesV2.USER_UNAUTHORIZED) {
          this.stop();
        }
        break;
      }

      default:
        if (WebSocketTopics.includes(message.type as WebSocketTopic)) {
          this.eventEmitter.emit(message.type, message.data);
        }
        break;
    }
  }

  protected startHeartbeat(): void {
    const configured = this.connectionOptions.websocket?.heartbeatInterval;
    const interval = configured === undefined ? DEFAULT_WEBSOCKET_HEARTBEAT_INTERVAL : configured;

    this.stopHeartbeat();

    if (!interval) return;

    this.heartbeatTimer = setInterval(() => {
      if (!this.socket) return;

      if (Date.now() - this.lastActivityAt > interval * 2) {
        this.log('Nothing received from the device, closing the WebSocket.');
        // Emits "close", which connects again when enabled
        this.socket.terminate();
        return;
      }

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.ping();
      }
    }, interval);
  }

  protected stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
