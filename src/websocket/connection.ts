import { WebSocket } from 'undici';
import { log, redact } from '@/shared/logger';
import { HomeWizardError } from '../errors';
import { Message, SocketTarget } from './types';

export interface ConnectionHandlers {
  /** Something arrived, readable or not: a sign of life. */
  onActivity(): void;
  /** Every message from the device, before the connection answers the ones of the authorization. */
  onMessage(message: Message): void;
  /** The device accepted the token. */
  onAuthorized(): void;
  /** The device asks for a token, and there is none. */
  onMissingToken(): void;
  /** The connection failed, or something arrived that isn't a message. A failed connection closes on its own. */
  onError(error: HomeWizardError): void;
  /**
   * The device or the network closed the connection. Not called after `close()`. `awaitingAuthorization` is
   * `true` when the token was sent and the device hadn't accepted it yet: the device drops the connection
   * without an error message when the token is wrong.
   */
  onClose(code: number, reason: string, awaitingAuthorization: boolean): void;
}

/**
 * One connection to the WebSocket of a device, from opening it to its close. It answers the device's request for
 * the token, and reports everything else to its handlers. `DeviceSocket` opens a new one for each (re)connect, so
 * the events of an old connection can't reach it: a closed connection reports nothing.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/websocket#authorization
 */
export class Connection {
  protected readonly socket: WebSocket;
  protected closed = false;
  protected tokenSent = false;
  protected accepted = false;

  constructor(
    protected readonly target: SocketTarget,
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

      this.closed = true;
      handlers.onClose(event.code, event.reason, this.tokenSent && !this.accepted);
    };
  }

  /** `true` once the device accepted the token. */
  get isAuthorized(): boolean {
    return this.accepted;
  }

  send(message: Message): void {
    this.log(`Sending ${redact(message)}`);
    this.socket.send(JSON.stringify(message));
  }

  /** Closes the connection. After this, it reports nothing more. */
  close(code?: number): void {
    this.closed = true;
    this.socket.close(code);
  }

  protected log(...args: unknown[]): void {
    log(this.target.logger, ...args);
  }

  protected handleMessage(raw: unknown): void {
    this.handlers.onActivity();

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
    this.handlers.onMessage(message);

    // A listener can close the socket from the message event
    if (this.closed) return;

    if (message.type === 'authorization_requested') this.authorize();
    else if (message.type === 'authorized') {
      this.accepted = true;
      this.handlers.onAuthorized();
    }
  }

  protected authorize(): void {
    const { token } = this.target;

    if (!token) {
      this.handlers.onMissingToken();
      return;
    }

    // Not logged: the message has the token
    this.socket.send(JSON.stringify({ type: 'authorization', data: token }));
    this.tokenSent = true;
  }
}
