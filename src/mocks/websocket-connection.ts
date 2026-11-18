import { HomeWizardError } from '../errors';
import {
  ConnectionClose,
  ConnectionHandlers,
  MessageKind,
  SocketConnection,
} from '../websocket/connection';
import { Message, SocketTarget } from '../websocket/types';

/**
 * A fake `Connection` for the `DeviceSocket` tests: it records what the socket sends, and the tests script what the
 * device does. Like the real one, a closed connection reports nothing.
 */
export class FakeConnection implements SocketConnection {
  /** Every connection so far, in order. Clear it before each test. */
  static instances: FakeConnection[] = [];

  isAuthorized = false;
  /** The messages sent so far, without the token. */
  sent: Message[] = [];
  /** `true` after `close()` or a close the test scripted. */
  closed = false;
  /** The code `close()` was called with. */
  closedWith: number | undefined;

  constructor(
    readonly target: SocketTarget,
    readonly heartbeatInterval: number,
    readonly handlers: ConnectionHandlers,
  ) {
    FakeConnection.instances.push(this);
  }

  /** The connection the socket opened last. */
  static get last(): FakeConnection {
    return FakeConnection.instances[FakeConnection.instances.length - 1];
  }

  send(message: Message): void {
    this.sent.push(message);
  }

  close(code?: number): void {
    this.closed = true;
    this.closedWith = code;
  }

  /** The device sends a message. */
  receive(message: Message, kind: MessageKind = 'data'): void {
    if (!this.closed) this.handlers.onMessage(message, kind);
  }

  /** The device asks for the token and accepts it. */
  authorize(): void {
    this.receive(
      { type: 'authorization_requested', data: { api_version: '2.2.0' } },
      'authorization',
    );
    this.receive({ type: 'authorized' }, 'authorization');

    // A listener can close the socket from the message event
    if (this.closed) return;

    this.isAuthorized = true;
    this.handlers.onAuthorized();
  }

  error(error: HomeWizardError): void {
    if (!this.closed) this.handlers.onError(error);
  }

  /** The connection closes without `close()`, for `cause`. */
  drop(
    cause: ConnectionClose['cause'] = 'dropped',
    code = 1006,
    reason = cause === 'no-response' ? 'no response' : '',
  ): void {
    if (this.closed) return;

    this.closed = true;
    this.isAuthorized = false;
    this.handlers.onClose({ code, reason, cause });
  }
}
