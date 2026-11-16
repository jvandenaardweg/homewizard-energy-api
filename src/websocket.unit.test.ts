import { mockApiAgent } from '@/mocks/api';
import { HomeWizardApiV2WebSocketError } from './errors';
import { CommonTopics, DeviceSocket } from './websocket';

/*
 * The socket's handlers with a fake WebSocket and fake timers, for the cases a real connection can't produce on
 * demand: events from an old connection, errors without a message, and the heartbeat timing.
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

type Topics = CommonTopics<{ power_w?: number }, object>;

const connection = {
  url: 'wss://192.168.1.35/api/ws',
  token: 'TOKEN',
  dispatcher: mockApiAgent,
  logger: undefined,
};

function connect(options = {}) {
  const socket = new DeviceSocket<Topics>(connection, options);
  socket.connect();
  const fake = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  return { socket, fake };
}

function authorize(fake: FakeWebSocket) {
  fake.receive({ type: 'authorization_requested', data: { api_version: '2.2.0' } });
  fake.receive({ type: 'authorized' });
}

describe('v2/DeviceSocket handlers', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it('should connect with the dispatcher and the default options', () => {
    const socket = new DeviceSocket<Topics>(connection);
    socket.connect();
    const [fake] = FakeWebSocket.instances;

    expect(fake.url).toBe(connection.url);
    expect(fake.init).toStrictEqual({ dispatcher: mockApiAgent });
    socket.close();
  });

  it('should wrap a connection error, with and without a message', () => {
    const { socket, fake } = connect();
    const onError = vi.fn();
    socket.on('error', onError);

    fake.onerror?.({ error: new Error('ECONNREFUSED') });
    fake.onerror?.({ error: new Error('') });
    fake.onerror?.({});

    expect(onError.mock.calls.map(([error]) => error.message)).toStrictEqual([
      'The WebSocket connection failed: ECONNREFUSED',
      'The WebSocket connection failed',
      'The WebSocket connection failed',
    ]);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(HomeWizardApiV2WebSocketError);
    expect(onError.mock.calls[0][0].cause).toStrictEqual(new Error('ECONNREFUSED'));
  });

  it('should ignore the events of a connection it replaced', async () => {
    const { socket, fake: first } = connect({ reconnectDelay: 10 });
    const onMessage = vi.fn();
    const onError = vi.fn();
    const onClose = vi.fn();
    socket.on('message', onMessage).on('error', onError).on('close', onClose);

    first.onclose?.({ code: 1006, reason: '' });
    await vi.advanceTimersByTimeAsync(10);
    expect(FakeWebSocket.instances).toHaveLength(2);

    first.receive({ type: 'measurement', data: {} });
    first.onerror?.({ error: new Error('late') });
    first.onclose?.({ code: 1006, reason: '' });

    expect(onMessage).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    socket.close();
  });

  it('should only send a heartbeat after a silent interval, and drop the connection after two', async () => {
    const { socket, fake } = connect({ heartbeatInterval: 1000, reconnectDelay: 10 });
    authorize(fake);
    const onClose = vi.fn();
    socket.on('close', onClose);

    // A message just before each check keeps the connection quiet
    await vi.advanceTimersByTimeAsync(900);
    fake.receive({ type: 'measurement', data: { power_w: 1 } });
    await vi.advanceTimersByTimeAsync(100);
    expect(fake.sent).not.toContainEqual({ type: 'device' });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fake.sent).toContainEqual({ type: 'device' });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fake.close).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(1006, 'no response');

    await vi.advanceTimersByTimeAsync(10);
    expect(FakeWebSocket.instances).toHaveLength(2);
    socket.close();
  });

  it('should reconnect after a close without having sent the token', async () => {
    const { socket, fake } = connect({ reconnectDelay: 10 });

    fake.onclose?.({ code: 1006, reason: 'network down' });
    await vi.advanceTimersByTimeAsync(10);

    expect(FakeWebSocket.instances).toHaveLength(2);
    socket.close();
  });
});
