import { Dispatcher } from 'undici';
import { LoggerOptions } from '@/shared/logger';
import { Batteries, DeviceInformation, User } from '../types';

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

/**
 * Where and how a socket connects: the URL, the token, and the dispatcher with the certificate checks.
 *
 * @internal
 */
export interface SocketTarget {
  url: string;
  token: string | undefined;
  dispatcher: Dispatcher;
  logger: LoggerOptions | undefined;
}

/** A message to or from the device: a topic or command, and its data. */
export interface Message {
  type: string;
  data?: unknown;
}
