import { AddressInfo } from 'net';
import { WebSocketServer, WebSocket as ServerSocket } from 'ws';
import { P1MeterApiV2 } from '@/p1-meter-api-v2';
import { mockTokenV2 } from '@/mocks/api-v2';
import { mockP1MeterMeasurementResponse, mockSystemV2Response } from '@/mocks/data/v2';
import {
  HomeWizardEnergyApiV2WebSocketError,
  HomeWizardEnergyWebSocket,
  WebSocketMessage,
} from '@/websocket-v2';

let server: WebSocketServer;
let api: P1MeterApiV2;
let received: WebSocketMessage[];
let clients: ServerSocket[];
let acceptToken = true;

const waitFor = async (condition: () => boolean, timeout = 2000) => {
  const startedAt = Date.now();

  while (!condition()) {
    if (Date.now() - startedAt > timeout) throw new Error('waitFor timeout');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};

/** A fake device that behaves like the WebSocket of the API v2 */
const startServer = () =>
  new Promise<void>(resolve => {
    server = new WebSocketServer({ port: 0, path: '/api/ws' }, resolve);

    server.on('connection', client => {
      clients.push(client);
      client.send(
        JSON.stringify({ type: 'authorization_requested', data: { api_version: '2.0.0' } }),
      );

      client.on('message', raw => {
        const message = JSON.parse(raw.toString()) as WebSocketMessage;

        received.push(message);

        if (message.type === 'authorization') {
          client.send(
            JSON.stringify(
              acceptToken && message.data === mockTokenV2
                ? { type: 'authorized' }
                : { type: 'error', data: { message: 'user:unauthorized' } },
            ),
          );
        } else if (message.type === 'subscribe' && message.data === 'measurement') {
          client.send(
            JSON.stringify({ type: 'measurement', data: mockP1MeterMeasurementResponse }),
          );
        } else if (message.type === 'subscribe') {
          client.send(
            JSON.stringify({ type: 'error', data: { message: 'request:unknown-subscription' } }),
          );
        } else if (message.type === 'system') {
          client.send(
            JSON.stringify({
              type: 'system',
              data: { ...mockSystemV2Response, ...(message.data as object) },
            }),
          );
        }
      });
    });
  });

describe('HomeWizardEnergyWebSocket', () => {
  beforeEach(async () => {
    // We use a real WebSocket server, so we need real timers
    vi.useRealTimers();

    received = [];
    clients = [];
    acceptToken = true;

    await startServer();

    api = new P1MeterApiV2(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, {
      api: { token: mockTokenV2 },
      websocket: { reconnectInterval: 20 },
    });
  });

  afterEach(async () => {
    await api.close();
    clients.forEach(client => client.terminate());
    await new Promise(resolve => server.close(resolve));
    vi.useFakeTimers();
  });

  it('should expose the same websocket instance', () => {
    expect(api.websocket).toBeInstanceOf(HomeWizardEnergyWebSocket);
    expect(api.websocket).toBe(api.websocket);
    expect(api.websocket['url']).toMatch(/^ws:\/\/127\.0\.0\.1:\d+\/api\/ws$/);
    expect(api.websocket.isStarted).toBe(false);
  });

  it('should use wss and the tls options when using https', () => {
    const httpsApi = new P1MeterApiV2('https://192.168.1.10', {
      api: { identifier: 'appliance/p1dongle/5c2fafaabbcc' },
    });

    expect(httpsApi.websocket['url']).toBe('wss://192.168.1.10/api/ws');
    expect(httpsApi.websocket['connectionOptions'].tls?.rejectUnauthorized).toBe(true);
    expect(httpsApi.websocket['connectionOptions'].tls?.ca).toContain('BEGIN CERTIFICATE');
  });

  it('should authorize with the token and receive the measurement of a subscription', async () => {
    const onAuthorized = vi.fn();
    const onMeasurement = vi.fn();
    const onMessage = vi.fn();

    api.websocket.on('authorized', onAuthorized);
    api.websocket.on('measurement', onMeasurement);
    api.websocket.on('message', onMessage);
    api.websocket.subscribe('measurement');
    api.websocket.start();
    // a second start does nothing
    api.websocket.start();

    await waitFor(() => onMeasurement.mock.calls.length > 0);

    expect(api.websocket.isAuthorized).toBe(true);
    expect(onAuthorized).toHaveBeenCalledOnce();
    expect(onMeasurement).toHaveBeenCalledWith(mockP1MeterMeasurementResponse);
    expect(onMessage).toHaveBeenCalledWith({ type: 'authorized' });
    expect(received).toStrictEqual([
      { type: 'authorization', data: mockTokenV2 },
      { type: 'subscribe', data: 'measurement' },
    ]);
    expect(clients).toHaveLength(1);
  });

  it('should subscribe, unsubscribe, request, update and identify when authorized', async () => {
    const onSystem = vi.fn();

    api.websocket.on('system', onSystem);
    api.websocket.start();

    await waitFor(() => api.websocket.isAuthorized);

    api.websocket.subscribe('measurement').unsubscribe('measurement');
    api.websocket.request('device');
    api.websocket.updateSystem({ status_led_brightness_pct: 50 });
    api.websocket.updateBatteries({ mode: 'standby' });
    api.websocket.identify();

    await waitFor(() => onSystem.mock.calls.length > 0 && received.length >= 7);

    expect(onSystem).toHaveBeenCalledWith({
      ...mockSystemV2Response,
      status_led_brightness_pct: 50,
    });
    expect(received.slice(1)).toStrictEqual([
      { type: 'subscribe', data: 'measurement' },
      { type: 'unsubscribe', data: 'measurement' },
      { type: 'device' },
      { type: 'system', data: { status_led_brightness_pct: 50 } },
      { type: 'batteries', data: { mode: 'standby' } },
      { type: 'identify' },
    ]);
  });

  it('should throw when sending while not authorized', () => {
    expect(() => api.websocket.identify()).toThrowError(HomeWizardEnergyApiV2WebSocketError);
  });

  it('should emit the errors of the device', async () => {
    const onError = vi.fn();

    api.websocket.on('error', onError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.websocket.subscribe('unknown' as any);
    api.websocket.start();

    await waitFor(() => onError.mock.calls.length > 0);

    const error = onError.mock.calls[0][0];

    expect(error).toBeInstanceOf(HomeWizardEnergyApiV2WebSocketError);
    expect(error.errorCode).toBe('request:unknown-subscription');
    // still connected
    expect(api.websocket.isAuthorized).toBe(true);
  });

  it('should stop (and not reconnect) when the token is not accepted', async () => {
    const onError = vi.fn();

    acceptToken = false;
    api.websocket.on('error', onError);
    api.websocket.start();

    await waitFor(() => onError.mock.calls.length > 0);
    await new Promise(resolve => setTimeout(resolve, 80));

    expect(onError.mock.calls[0][0].errorCode).toBe('user:unauthorized');
    expect(api.websocket.isStarted).toBe(false);
    expect(clients).toHaveLength(1);
  });

  it('should stop when there is no token', async () => {
    const onError = vi.fn();

    api.setToken(undefined);
    api.websocket.on('error', onError);
    api.websocket.start();

    await waitFor(() => onError.mock.calls.length > 0);

    expect(onError.mock.calls[0][0].message).toContain('there is no token');
    expect(api.websocket.isStarted).toBe(false);
  });

  it('should connect again and subscribe again when the connection is lost', async () => {
    const onClose = vi.fn();
    const onMeasurement = vi.fn();

    api.websocket.on('close', onClose);
    api.websocket.on('measurement', onMeasurement);
    api.websocket.subscribe('measurement');
    api.websocket.start();

    await waitFor(() => onMeasurement.mock.calls.length === 1);

    clients[0].terminate();

    await waitFor(() => onMeasurement.mock.calls.length === 2);

    expect(onClose).toHaveBeenCalledOnce();
    expect(clients).toHaveLength(2);
    expect(api.websocket.isAuthorized).toBe(true);
  });

  it('should not connect again when reconnect is disabled', async () => {
    const noReconnectApi = new P1MeterApiV2(api['baseUrl'], {
      api: { token: mockTokenV2 },
      websocket: { reconnect: false },
    });
    const onClose = vi.fn();

    noReconnectApi.websocket.on('close', onClose);
    noReconnectApi.websocket.start();

    await waitFor(() => noReconnectApi.websocket.isAuthorized);

    clients[0].terminate();

    await waitFor(() => onClose.mock.calls.length > 0);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(noReconnectApi.websocket.isStarted).toBe(false);
    expect(clients).toHaveLength(1);
  });

  it('should close the connection when nothing is received anymore', async () => {
    const heartbeatApi = new P1MeterApiV2(api['baseUrl'], {
      api: { token: mockTokenV2 },
      websocket: { heartbeatInterval: 20, reconnect: false },
    });
    const onClose = vi.fn();

    heartbeatApi.websocket.on('close', onClose);
    heartbeatApi.websocket.start();

    await waitFor(() => heartbeatApi.websocket.isAuthorized);

    // answers the pings: the connection stays open
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(onClose).not.toHaveBeenCalled();

    // the device stops answering
    clients[0].pause();
    (clients[0] as unknown as { _socket: { pause: () => void } })._socket.pause();

    await waitFor(() => onClose.mock.calls.length > 0);

    expect(heartbeatApi.websocket.isAuthorized).toBe(false);
  });

  it('should emit an error on an invalid message and when the connection fails', async () => {
    const onError = vi.fn();

    api.websocket.on('error', onError);
    api.websocket.start();

    await waitFor(() => api.websocket.isAuthorized);

    clients[0].send('not json');

    await waitFor(() => onError.mock.calls.length > 0);
    expect(onError.mock.calls[0][0].message).toContain('invalid WebSocket message');

    const unreachableApi = new P1MeterApiV2('http://127.0.0.1:1', {
      api: { token: mockTokenV2 },
      websocket: { reconnect: false },
    });
    const onUnreachableError = vi.fn();

    unreachableApi.websocket.on('error', onUnreachableError);
    unreachableApi.websocket.start();

    await waitFor(() => onUnreachableError.mock.calls.length > 0);
    expect(unreachableApi.websocket.isAuthorized).toBe(false);
  });

  it('should remove the listeners and stop', async () => {
    const onMeasurement = vi.fn();

    api.websocket.on('measurement', onMeasurement);
    api.websocket.off('measurement', onMeasurement);
    api.websocket.on('measurement', onMeasurement);
    api.websocket.removeAllListeners();
    api.websocket.subscribe('measurement');
    api.websocket.start();

    await waitFor(() => received.length === 2);

    api.websocket.stop();

    expect(api.websocket.isStarted).toBe(false);
    expect(onMeasurement).not.toHaveBeenCalled();
  });
});
