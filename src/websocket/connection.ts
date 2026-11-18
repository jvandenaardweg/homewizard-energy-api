import { WebSocket } from 'undici';
import { log, redact } from '@/shared/logger';
import { HomeWizardError } from '../errors';
import { Message, SocketTarget } from './types';

/**
 * What a message is to the connection:
 *
 * - `authorization`: part of the authorization, which the connection answers itself.
 * - `heartbeat`: the device information, sent while the heartbeat waited for an answer to its request.
 * - `data`: anything else, for the user.
 */
export type MessageKind = 'authorization' | 'heartbeat' | 'data';

/**
 * Why a connection closed:
 *
 * - `dropped`: the device or the network closed it.
 * - `rejected-token`: the device closed it after the token was sent, before it accepted the token. The device
 *   does this for a wrong token, without an error message, and a network drop in that moment looks the same.
 * - `missing-token`: the device asked for a token and there is none, so the connection closed itself.
 * - `no-response`: nothing arrived for two heartbeat intervals, so the connection closed itself.
 */
export interface ConnectionClose {
  code: number;
  reason: string;
  cause: 'dropped' | 'rejected-token' | 'missing-token' | 'no-response';
}

export interface ConnectionHandlers {
  /** Every message from the device, before the connection acts on it. */
  onMessage(message: Message, kind: MessageKind): void;
  /** The device accepted the token. */
  onAuthorized(): void;
  /** The connection failed, or something arrived that isn't a message. A failed connection closes on its own. */
  onError(error: HomeWizardError): void;
  /** The connection closed, without `close()`. It reports nothing after this. */
  onClose(close: ConnectionClose): void;
}

/** One connection, as `DeviceSocket` uses it. `Connection` is the real one, and the tests have a fake. */
export interface SocketConnection {
  /** `true` once the device accepted the token. */
  readonly isAuthorized: boolean;
  send(message: Message): void;
  /** Closes the connection. After this, it reports nothing more. */
  close(code?: number): void;
}

/** How `DeviceSocket` opens a connection: `Connection`, or a fake in the tests. */
export type ConnectionClass = new (
  target: SocketTarget,
  heartbeatInterval: number,
  handlers: ConnectionHandlers,
) => SocketConnection;

/**
 * One connection to the WebSocket of a device, from opening it to its close. It answers the device's request for
 * the token, and once the device accepts it, watches the connection for silence. `DeviceSocket` opens a new one
 * for each (re)connect, so the events of an old connection can't reach it: a closed connection reports nothing.
 *
 * undici's WebSocket has no pong event, so the heartbeat asks the device for its information after one interval
 * without a message, and closes the connection after two. Any message counts as a sign of life.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/websocket#authorization
 */
export class Connection implements SocketConnection {
  protected readonly socket: WebSocket;
  protected closed = false;
  protected tokenSent = false;
  protected accepted = false;
  protected heartbeat: ReturnType<typeof setInterval> | undefined;
  protected lastMessageAt = 0;
  /** `true` while the heartbeat waits for the device information it asked for. */
  protected pinged = false;

  /**
   * @param heartbeatInterval The silence, in milliseconds, after which to ask for a sign of life. `0` disables it.
   */
  constructor(
    protected readonly target: SocketTarget,
    protected readonly heartbeatInterval: number,
    protected readonly handlers: ConnectionHandlers,
  ) {
    this.log(`Connecting to ${target.url}`);

    this.socket = new WebSocket(target.url, { dispatcher: target.dispatcher });

    this.socket.onmessage = event => {
      if (!this.closed) this.handleMessage(event.data);
    };
    this.socket.onerror = event => {
      if (this.closed) return;

      const cause = (event as unknown as { error?: unknown }).error;
      const detail = cause instanceof Error && cause.message ? `: ${cause.message}` : '';

      handlers.onError(
        new HomeWizardError('socket', `The WebSocket connection failed${detail}`, { cause }),
      );
    };
    this.socket.onclose = event => {
      if (this.closed) return;

      this.end({
        code: event.code,
        reason: event.reason,
        cause: this.tokenSent && !this.accepted ? 'rejected-token' : 'dropped',
      });
    };
  }

  get isAuthorized(): boolean {
    return this.accepted;
  }

  send(message: Message): void {
    this.log(`Sending ${redact(message)}`);
    this.socket.send(JSON.stringify(message));
  }

  close(code?: number): void {
    this.closed = true;
    clearInterval(this.heartbeat);
    this.socket.close(code);
  }

  protected log(...args: unknown[]): void {
    log(this.target.logger, ...args);
  }

  /** The connection is over: it stops watching, reports the close, and nothing after it. */
  protected end(close: ConnectionClose): void {
    this.closed = true;
    clearInterval(this.heartbeat);
    this.handlers.onClose(close);
  }

  protected handleMessage(raw: unknown): void {
    // Anything that arrives is a sign of life, readable or not
    this.lastMessageAt = Date.now();

    let message: Message;

    try {
      message = JSON.parse(String(raw)) as Message;
    } catch {
      this.handlers.onError(
        new HomeWizardError('socket', `Received a message that is not JSON: ${String(raw)}`),
      );
      return;
    }

    this.log(`Received ${message.type}`);
    this.handlers.onMessage(message, this.kindOf(message));

    // A listener can close the socket from the message event
    if (this.closed) return;

    if (message.type === 'authorization_requested') this.authorize();
    else if (message.type === 'authorized') {
      this.accepted = true;
      this.startHeartbeat();
      this.handlers.onAuthorized();
    }
  }

  protected kindOf(message: Message): MessageKind {
    if (message.type === 'authorization_requested' || message.type === 'authorized') {
      return 'authorization';
    }

    if (message.type === 'device' && this.pinged) {
      this.pinged = false;
      return 'heartbeat';
    }

    return 'data';
  }

  protected authorize(): void {
    const { token } = this.target;

    if (!token) {
      this.socket.close(1000);
      this.end({ code: 1000, reason: 'closed', cause: 'missing-token' });
      return;
    }

    // Not logged: the message has the token
    this.socket.send(JSON.stringify({ type: 'authorization', data: token }));
    this.tokenSent = true;
  }

  protected startHeartbeat(): void {
    const interval = this.heartbeatInterval;

    if (!interval) return;

    // A repeated `authorized` starts over, with one timer
    clearInterval(this.heartbeat);
    this.pinged = false;
    this.lastMessageAt = Date.now();

    this.heartbeat = setInterval(() => {
      const silentFor = Date.now() - this.lastMessageAt;

      if (silentFor >= interval * 2) {
        this.log(`Nothing received for ${silentFor}ms`);
        this.socket.close();
        this.end({ code: 1006, reason: 'no response', cause: 'no-response' });
        return;
      }

      if (silentFor >= interval && !this.pinged) {
        this.pinged = true;
        this.send({ type: 'device' });
      }
      // Checking twice per interval asks well before the connection counts as dead
    }, interval / 2);
  }
}
