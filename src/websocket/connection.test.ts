import { mockApiAgent } from '@/mocks/agent';
import { HomeWizardError } from '../errors';
import { Connection, ConnectionHandlers } from './connection';
import { SocketTarget } from './types';

/*
 * One connection with a fake WebSocket and fake timers: the authorization, the heartbeat, and what it reports to
 * its handlers.
 */

const { FakeWebSocket } = vi.hoisted(() => {
  class FakeWebSocket {
    static instances: FakeWebSocket[] = [];
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;
    sent: unknown[] = [];
    close = vi.fn();

    constructor(
      public url: string,
      public init: unknown,
    ) {
      FakeWebSocket.instances.push(this);
    }

    send(data: string) {
      this.sent.push(JSON.parse(data));
    }

    receive(message: unknown) {
      this.onmessage?.({ data: JSON.stringify(message) });
    }
  }

  return { FakeWebSocket };
});

type FakeWebSocket = InstanceType<typeof FakeWebSocket>;

vi.mock('undici', async importOriginal => ({
  ...(await importOriginal<typeof import('undici')>()),
  WebSocket: FakeWebSocket,
}));

const target: SocketTarget = {
  url: 'wss://192.168.1.35/api/ws',
  token: 'TOKEN',
  dispatcher: mockApiAgent,
  logger: undefined,
};

function open(
  {
    heartbeatInterval = 0,
    ...overrides
  }: Partial<SocketTarget> & { heartbeatInterval?: number } = {},
  handlerOverrides: Partial<ConnectionHandlers> = {},
) {
  const handlers = {
    onMessage: vi.fn<ConnectionHandlers['onMessage']>(),
    onAuthorized: vi.fn<ConnectionHandlers['onAuthorized']>(),
    onError: vi.fn<ConnectionHandlers['onError']>(),
    onClose: vi.fn<ConnectionHandlers['onClose']>(),
  };
  const connection = new Connection({ ...target, ...overrides }, heartbeatInterval, {
    ...handlers,
    ...handlerOverrides,
  });
  const fake = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

  return { connection, fake, handlers };
}

function authorize(fake: FakeWebSocket) {
  fake.receive({ type: 'authorization_requested', data: { api_version: '2.2.0' } });
  fake.receive({ type: 'authorized' });
}

describe('v2/Connection', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it('should connect to the URL with the dispatcher', () => {
    const { fake } = open();

    expect(fake.url).toBe(target.url);
    expect(fake.init).toStrictEqual({ dispatcher: mockApiAgent });
  });

  it('should answer the request for the token, and report the authorization', () => {
    const { connection, fake, handlers } = open();

    fake.receive({ type: 'authorization_requested', data: { api_version: '2.2.0' } });

    expect(fake.sent).toStrictEqual([{ type: 'authorization', data: 'TOKEN' }]);
    expect(connection.isAuthorized).toBe(false);

    fake.receive({ type: 'authorized' });

    expect(connection.isAuthorized).toBe(true);
    expect(handlers.onAuthorized).toHaveBeenCalledTimes(1);
    expect(handlers.onMessage.mock.calls).toStrictEqual([
      [{ type: 'authorization_requested', data: { api_version: '2.2.0' } }, 'authorization'],
      [{ type: 'authorized' }, 'authorization'],
    ]);
  });

  it('should report a message before it acts on it', () => {
    const { connection, fake } = open(
      {},
      {
        onMessage: () => {
          // The token isn't sent yet, and the device hasn't accepted it
          expect(fake.sent).toStrictEqual([]);
          expect(connection.isAuthorized).toBe(false);
        },
      },
    );

    fake.receive({ type: 'authorization_requested' });
    fake.sent = [];
    fake.receive({ type: 'authorized' });

    expect(connection.isAuthorized).toBe(true);
  });

  it('should report other messages as data', () => {
    const { fake, handlers } = open();
    authorize(fake);

    fake.receive({ type: 'measurement', data: { power_w: 1 } });
    fake.receive({ type: 'device', data: { serial: 'x' } });

    expect(handlers.onMessage.mock.calls.slice(2)).toStrictEqual([
      [{ type: 'measurement', data: { power_w: 1 } }, 'data'],
      [{ type: 'device', data: { serial: 'x' } }, 'data'],
    ]);
  });

  it('should close itself, and report a missing token, when there is none', () => {
    const { connection, fake, handlers } = open({ token: undefined });

    fake.receive({ type: 'authorization_requested' });

    expect(fake.sent).toStrictEqual([]);
    expect(fake.close).toHaveBeenCalledWith(1000);
    expect(handlers.onClose).toHaveBeenCalledExactlyOnceWith({
      code: 1000,
      reason: 'closed',
      cause: 'missing-token',
    });
    expect(connection.isAuthorized).toBe(false);
  });

  it('should report a close after the token and before the authorization as a rejected token', () => {
    const { fake, handlers } = open();
    fake.receive({ type: 'authorization_requested' });

    fake.onclose?.({ code: 1006, reason: '' });

    expect(handlers.onClose).toHaveBeenCalledExactlyOnceWith({
      code: 1006,
      reason: '',
      cause: 'rejected-token',
    });
  });

  it('should report a close before the token, or after the authorization, as a drop', () => {
    const before = open();
    before.fake.onclose?.({ code: 1006, reason: 'network down' });

    const after = open();
    authorize(after.fake);
    after.fake.onclose?.({ code: 1001, reason: 'going away' });

    expect(before.handlers.onClose).toHaveBeenCalledExactlyOnceWith({
      code: 1006,
      reason: 'network down',
      cause: 'dropped',
    });
    expect(after.handlers.onClose).toHaveBeenCalledExactlyOnceWith({
      code: 1001,
      reason: 'going away',
      cause: 'dropped',
    });
  });

  it('should wrap a connection error, with and without a message', () => {
    const { fake, handlers } = open();

    fake.onerror?.({ error: new Error('ECONNREFUSED') });
    fake.onerror?.({ error: new Error('') });
    fake.onerror?.({});

    expect(handlers.onError.mock.calls.map(([error]) => error.message)).toStrictEqual([
      'The WebSocket connection failed: ECONNREFUSED',
      'The WebSocket connection failed',
      'The WebSocket connection failed',
    ]);
    expect(handlers.onError.mock.calls[0][0]).toBeInstanceOf(HomeWizardError);
    expect(handlers.onError.mock.calls[0][0].kind).toBe('socket');
    expect(handlers.onError.mock.calls[0][0].cause).toStrictEqual(new Error('ECONNREFUSED'));
  });

  it('should report a message that is not JSON as an error', () => {
    const { fake, handlers } = open();

    fake.onmessage?.({ data: 'not json' });

    expect(handlers.onError.mock.calls[0][0].message).toBe(
      'Received a message that is not JSON: not json',
    );
    expect(handlers.onMessage).not.toHaveBeenCalled();
  });

  it('should report nothing after it closed', () => {
    const closed = open();
    closed.connection.close(1000);
    const dropped = open();
    dropped.fake.onclose?.({ code: 1006, reason: '' });

    for (const { fake } of [closed, dropped]) {
      fake.receive({ type: 'measurement', data: {} });
      fake.onerror?.({ error: new Error('late') });
      fake.onclose?.({ code: 1006, reason: '' });
    }

    expect(closed.fake.close).toHaveBeenCalledWith(1000);
    expect(closed.handlers.onMessage).not.toHaveBeenCalled();
    expect(closed.handlers.onError).not.toHaveBeenCalled();
    expect(closed.handlers.onClose).not.toHaveBeenCalled();
    expect(dropped.handlers.onMessage).not.toHaveBeenCalled();
    expect(dropped.handlers.onError).not.toHaveBeenCalled();
    expect(dropped.handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('should stay closed when a listener closes it from the message of the authorization', async () => {
    const opened = open(
      { heartbeatInterval: 1000 },
      {
        onMessage: message => {
          if (message.type === 'authorized') opened.connection.close();
        },
      },
    );

    authorize(opened.fake);

    expect(opened.connection.isAuthorized).toBe(false);
    expect(opened.handlers.onAuthorized).not.toHaveBeenCalled();

    // No heartbeat runs on the closed connection
    await vi.advanceTimersByTimeAsync(3000);
    expect(opened.fake.sent).not.toContainEqual({ type: 'device' });
  });

  it('should log what it sends without the token', () => {
    const method = vi.fn();
    const { connection, fake } = open({ logger: { method } });

    fake.receive({ type: 'authorization_requested' });
    connection.send({ type: 'subscribe', data: 'measurement' });

    const logged = JSON.stringify(method.mock.calls);
    expect(logged).toContain('Connecting to wss://192.168.1.35/api/ws');
    expect(logged).toContain('Received authorization_requested');
    expect(logged).toContain('Sending');
    expect(logged).toContain('measurement');
    expect(logged).not.toContain('TOKEN');
    expect(fake.sent).toContainEqual({ type: 'subscribe', data: 'measurement' });
  });

  describe('heartbeat', () => {
    it('should ask for the device once after one interval of silence, and close after two', async () => {
      const { fake, handlers } = open({ heartbeatInterval: 1000 });
      authorize(fake);
      const pings = () =>
        fake.sent.filter(message => (message as { type: string }).type === 'device');

      await vi.advanceTimersByTimeAsync(999);
      expect(pings()).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(501);
      expect(pings()).toStrictEqual([{ type: 'device' }]);
      expect(handlers.onClose).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(500);
      expect(pings()).toHaveLength(1);
      expect(fake.close).toHaveBeenCalledWith();
      expect(handlers.onClose).toHaveBeenCalledExactlyOnceWith({
        code: 1006,
        reason: 'no response',
        cause: 'no-response',
      });

      // Closed, so it watches no more, and reports nothing
      fake.onclose?.({ code: 1006, reason: '' });
      await vi.advanceTimersByTimeAsync(5000);
      expect(handlers.onClose).toHaveBeenCalledTimes(1);
      expect(pings()).toHaveLength(1);
    });

    it('should count from the last message, readable or not', async () => {
      const { fake, handlers } = open({ heartbeatInterval: 1000 });
      authorize(fake);

      await vi.advanceTimersByTimeAsync(900);
      fake.receive({ type: 'measurement', data: { power_w: 1 } });
      await vi.advanceTimersByTimeAsync(900);
      fake.onmessage?.({ data: 'not json' });
      await vi.advanceTimersByTimeAsync(900);

      expect(fake.sent).not.toContainEqual({ type: 'device' });
      expect(handlers.onClose).not.toHaveBeenCalled();
    });

    it('should report the answer as heartbeat, and ask again for the next silence', async () => {
      const { fake, handlers } = open({ heartbeatInterval: 1000 });
      authorize(fake);

      await vi.advanceTimersByTimeAsync(1000);
      fake.receive({ type: 'device', data: { serial: 'x' } });
      fake.receive({ type: 'device', data: { serial: 'y' } });

      expect(handlers.onMessage.mock.calls.slice(2)).toStrictEqual([
        [{ type: 'device', data: { serial: 'x' } }, 'heartbeat'],
        [{ type: 'device', data: { serial: 'y' } }, 'data'],
      ]);

      await vi.advanceTimersByTimeAsync(1000);
      expect(
        fake.sent.filter(message => (message as { type: string }).type === 'device'),
      ).toHaveLength(2);
    });

    it('should run one timer when the device sends authorized twice', async () => {
      const { connection, fake, handlers } = open({ heartbeatInterval: 1000 });
      authorize(fake);
      await vi.advanceTimersByTimeAsync(1000);
      fake.receive({ type: 'authorized' });

      expect(handlers.onAuthorized).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(1);

      // It counts from the second, and asks once
      await vi.advanceTimersByTimeAsync(1000);
      expect(
        fake.sent.filter(message => (message as { type: string }).type === 'device'),
      ).toHaveLength(2);

      connection.close();
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(5000);
      expect(handlers.onClose).not.toHaveBeenCalled();
    });

    it('should only run once the device accepted the token', async () => {
      const { fake, handlers } = open({ heartbeatInterval: 1000 });
      fake.receive({ type: 'authorization_requested' });

      await vi.advanceTimersByTimeAsync(5000);

      expect(fake.sent).toStrictEqual([{ type: 'authorization', data: 'TOKEN' }]);
      expect(handlers.onClose).not.toHaveBeenCalled();
    });

    it('should stop when the connection closes', async () => {
      const closed = open({ heartbeatInterval: 1000 });
      authorize(closed.fake);
      closed.connection.close();
      const dropped = open({ heartbeatInterval: 1000 });
      authorize(dropped.fake);
      dropped.fake.onclose?.({ code: 1006, reason: '' });

      await vi.advanceTimersByTimeAsync(5000);

      for (const { fake } of [closed, dropped]) {
        expect(fake.sent).not.toContainEqual({ type: 'device' });
      }
      expect(closed.handlers.onClose).not.toHaveBeenCalled();
      expect(dropped.handlers.onClose).toHaveBeenCalledTimes(1);
    });

    it('should do nothing with an interval of 0', async () => {
      const { fake, handlers } = open({ heartbeatInterval: 0 });
      authorize(fake);

      await vi.advanceTimersByTimeAsync(60000);

      expect(fake.sent).toStrictEqual([{ type: 'authorization', data: 'TOKEN' }]);
      expect(handlers.onClose).not.toHaveBeenCalled();
    });
  });
});
