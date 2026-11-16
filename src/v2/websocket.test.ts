import { mockV2P1MeterMeasurement, mockV2Token } from '@/mocks/data/v2';
import { mockTlsCa, mockTlsIdentifier } from '@/mocks/tls/server';
import {
  authorizeLikeADevice,
  MockWebSocketConnection,
  MockWebSocketServer,
  startMockWebSocketServer,
} from '@/mocks/tls/websocket-server';
import { P1Meter } from './devices/p1-meter';
import { HomeWizardApiV2WebSocketError } from './errors';
import { DeviceSocket, WebSocketOptions } from './websocket';

/** Resolves once `predicate` is true, checking every 5ms. */
async function waitFor(predicate: () => boolean, timeout = 3000): Promise<void> {
  const started = Date.now();

  while (!predicate()) {
    if (Date.now() - started > timeout) throw new Error('Timed out waiting for the condition');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('v2/DeviceSocket', () => {
  let server: MockWebSocketServer;
  let onConnection: (connection: MockWebSocketConnection) => void;
  const sockets: DeviceSocket<object>[] = [];

  const open = (options: WebSocketOptions = {}, token: string | undefined = mockV2Token) => {
    const p1 = new P1Meter(server.host, { ca: mockTlsCa, identifier: mockTlsIdentifier, token });
    const socket = p1.openWebSocket({ reconnectDelay: 10, ...options });
    sockets.push(socket as DeviceSocket<object>);
    return socket;
  };

  beforeEach(async () => {
    vi.useRealTimers();
    onConnection = connection => authorizeLikeADevice(connection, mockV2Token);
    server = await startMockWebSocketServer(connection => onConnection(connection));
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.close();
    await server.close();
    // The global afterEach in vitest.setup.ts runs the fake timers
    vi.useFakeTimers();
  });

  it('should connect to /api/ws over TLS and authorize with the token', async () => {
    const socket = open();
    const onAuthorized = vi.fn();
    socket.on('authorized', onAuthorized);

    await waitFor(() => socket.isAuthorized);

    expect(onAuthorized).toHaveBeenCalledTimes(1);
    expect(server.connections[0].received).toStrictEqual([
      { type: 'authorization', data: mockV2Token },
    ]);
  });

  it('should subscribe after authorizing and emit the data of the topic', async () => {
    const socket = open();
    const onMeasurement = vi.fn();
    socket.on('measurement', onMeasurement);
    socket.subscribe('measurement');

    await waitFor(() => socket.isAuthorized);
    const [connection] = server.connections;
    await waitFor(() => connection.received.length === 2);

    expect(connection.received[1]).toStrictEqual({ type: 'subscribe', data: 'measurement' });

    connection.send({ type: 'measurement', data: mockV2P1MeterMeasurement });
    await waitFor(() => onMeasurement.mock.calls.length === 1);

    expect(onMeasurement).toHaveBeenCalledWith(mockV2P1MeterMeasurement);
  });

  it('should queue commands until authorized, then send them right away', async () => {
    const socket = open();
    socket.request('system');
    socket.set('batteries', { mode: 'zero' });

    await waitFor(() => socket.isAuthorized);
    const [connection] = server.connections;

    socket.identify();
    socket.subscribe('*');
    socket.unsubscribe('*');

    await waitFor(() => connection.received.length === 6);

    expect(connection.received.slice(1)).toStrictEqual([
      { type: 'system' },
      { type: 'batteries', data: { mode: 'zero' } },
      { type: 'identify' },
      { type: 'subscribe', data: '*' },
      { type: 'unsubscribe', data: '*' },
    ]);
  });

  it('should not queue a subscription that was removed before authorizing', async () => {
    const socket = open();
    socket.subscribe('measurement');
    socket.unsubscribe('measurement');

    await waitFor(() => socket.isAuthorized);
    await sleep(20);

    expect(server.connections[0].received).toStrictEqual([
      { type: 'authorization', data: mockV2Token },
    ]);
  });

  it('should emit an error and close without a token', async () => {
    const socket = open({}, '');
    const onError = vi.fn();
    const onClose = vi.fn();
    socket.on('error', onError).on('close', onClose);

    await waitFor(() => onClose.mock.calls.length === 1);
    await sleep(30);

    expect(onError.mock.calls[0][0]).toBeInstanceOf(HomeWizardApiV2WebSocketError);
    expect(onError.mock.calls[0][0].code).toBe('user:unauthorized');
    expect(server.connections).toHaveLength(1);
  });

  it('should report a rejected token and not reconnect', async () => {
    const socket = open({}, 'WRONG');
    const errors: HomeWizardApiV2WebSocketError[] = [];
    socket.on('error', error => errors.push(error as HomeWizardApiV2WebSocketError));

    await waitFor(() => errors.some(error => error.code === 'user:unauthorized'));
    await sleep(50);

    expect(server.connections).toHaveLength(1);
    expect(socket.isAuthorized).toBe(false);
  });

  it('should emit error messages from the device with their code', async () => {
    const socket = open();
    const onError = vi.fn();
    socket.on('error', onError);
    await waitFor(() => socket.isAuthorized);

    server.connections[0].send({
      type: 'error',
      data: { message: 'json:parameter-invalid-type:status_led_brightness_pct' },
    });
    server.connections[0].send({ type: 'error', data: 'something' });

    await waitFor(() => onError.mock.calls.length === 2);

    expect(onError.mock.calls[0][0].code).toBe(
      'json:parameter-invalid-type:status_led_brightness_pct',
    );
    expect(onError.mock.calls[1][0].message).toBe('The device sent an error: "something"');
    expect(socket.isAuthorized).toBe(true);
  });

  it('should close for an unauthorized error message', async () => {
    const socket = open();
    const onClose = vi.fn();
    socket.on('close', onClose);
    await waitFor(() => socket.isAuthorized);

    server.connections[0].send({ type: 'error', data: { message: 'user:unauthorized' } });
    await waitFor(() => onClose.mock.calls.length === 1);
    await sleep(30);

    expect(server.connections).toHaveLength(1);
  });

  it('should emit an error for a message that is not JSON', async () => {
    const socket = open();
    const onError = vi.fn();
    socket.on('error', onError);
    await waitFor(() => socket.isAuthorized);

    server.connections[0].sendRaw('not json');
    await waitFor(() => onError.mock.calls.length === 1);

    expect(onError.mock.calls[0][0].message).toBe('Received a message that is not JSON: not json');
  });

  it('should reconnect after a drop and subscribe again', async () => {
    const socket = open();
    socket.subscribe('measurement');
    const onClose = vi.fn();
    socket.on('close', onClose);
    await waitFor(() => socket.isAuthorized);

    server.connections[0].destroy();

    await waitFor(() => server.connections.length === 2 && socket.isAuthorized);
    await waitFor(() => server.connections[1].received.length === 2);

    expect(onClose).toHaveBeenCalled();
    expect(server.connections[1].received[1]).toStrictEqual({
      type: 'subscribe',
      data: 'measurement',
    });
  });

  it('should back off between failed reconnects', async () => {
    let refused = 0;
    onConnection = connection => {
      if (refused < 2) {
        refused++;
        connection.destroy();
        return;
      }
      authorizeLikeADevice(connection, mockV2Token);
    };

    const method = vi.fn();
    const p1 = new P1Meter(server.host, {
      ca: mockTlsCa,
      identifier: mockTlsIdentifier,
      token: mockV2Token,
      logger: { method },
    });
    const socket = p1.openWebSocket({ reconnectDelay: 10, maxReconnectDelay: 15 });
    sockets.push(socket as DeviceSocket<object>);

    await waitFor(() => socket.isAuthorized);

    const logged = JSON.stringify(method.mock.calls);
    expect(logged).toContain('Reconnecting in 10ms');
    expect(logged).toContain('Reconnecting in 15ms');
    expect(logged).not.toContain(mockV2Token);
  });

  it('should not reconnect with reconnect: false', async () => {
    const socket = open({ reconnect: false });
    await waitFor(() => socket.isAuthorized);

    server.connections[0].destroy();
    await sleep(50);

    expect(server.connections).toHaveLength(1);
  });

  it('should ask for the device information when silent, and hide the answer', async () => {
    const socket = open({ heartbeatInterval: 300 });
    const onDevice = vi.fn();
    socket.on('device', onDevice);
    await waitFor(() => socket.isAuthorized);

    const [connection] = server.connections;
    connection.on('message', message => {
      if (message.type === 'device') connection.send({ type: 'device', data: { serial: 'x' } });
    });

    await waitFor(() => connection.received.some(message => message.type === 'device'));
    await sleep(20);

    expect(onDevice).not.toHaveBeenCalled();
    expect(server.connections).toHaveLength(1);
  });

  it('should pass the heartbeat answer on when subscribed to the device', async () => {
    const socket = open({ heartbeatInterval: 300 });
    const onDevice = vi.fn();
    socket.on('device', onDevice);
    socket.subscribe('device');
    await waitFor(() => socket.isAuthorized);

    const [connection] = server.connections;
    connection.on('message', message => {
      if (message.type === 'device') connection.send({ type: 'device', data: { serial: 'x' } });
    });

    await waitFor(() => onDevice.mock.calls.length > 0);

    expect(onDevice).toHaveBeenCalledWith({ serial: 'x' });
  });

  it('should reconnect when the device stays silent', async () => {
    const socket = open({ heartbeatInterval: 300 });
    await waitFor(() => socket.isAuthorized);

    await waitFor(() => server.connections.length === 2);

    expect(server.connections[0].received.some(message => message.type === 'device')).toBe(true);
  });

  it('should not run the heartbeat with heartbeatInterval 0', async () => {
    const socket = open({ heartbeatInterval: 0 });
    await waitFor(() => socket.isAuthorized);
    await sleep(50);

    expect(server.connections[0].received).toHaveLength(1);
  });

  it('should report a certificate of another identifier and not authorize', async () => {
    const p1 = new P1Meter(server.host, {
      ca: mockTlsCa,
      identifier: 'appliance/p1dongle/000000000000',
      token: mockV2Token,
    });
    const socket = p1.openWebSocket({ reconnect: false });
    sockets.push(socket as DeviceSocket<object>);
    const onError = vi.fn();
    socket.on('error', onError);

    await waitFor(() => onError.mock.calls.length > 0);

    expect(onError.mock.calls[0][0].message).toMatch(/^The WebSocket connection failed/);
    expect(server.connections).toHaveLength(0);
  });

  it('should close on close(), emit close once and ignore a second connect while connected', async () => {
    const socket = open();
    const onClose = vi.fn();
    socket.on('close', onClose);
    await waitFor(() => socket.isAuthorized);

    socket.connect();
    socket.close();
    socket.close();
    await sleep(30);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(1000, 'closed');
    expect(server.connections).toHaveLength(1);
  });

  it('should remove a listener with off()', async () => {
    const socket = open();
    const onMessage = vi.fn();
    socket.on('message', onMessage).off('message', onMessage);

    await waitFor(() => socket.isAuthorized);

    expect(onMessage).not.toHaveBeenCalled();
  });
});
