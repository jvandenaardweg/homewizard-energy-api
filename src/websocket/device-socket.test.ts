import { mockV2P1MeterMeasurement, mockV2Token } from '@/mocks/data/v2';
import { mockTlsCa, mockTlsIdentifier } from '@/mocks/tls/server';
import {
  authorizeLikeADevice,
  MockWebSocketConnection,
  MockWebSocketServer,
  startMockWebSocketServer,
} from '@/mocks/tls/websocket-server';
import { KwhMeter1Phase } from '../devices/kwh-meter';
import { P1Meter } from '../devices/p1-meter';
import { PlugInBattery } from '../devices/plug-in-battery';
import { HomeWizardError } from '../errors';
import { DeviceSocket, WebSocketOptions } from '.';

/** Resolves once `predicate` is true, checking every 5ms. */
async function waitFor(predicate: () => boolean, timeout = 3000): Promise<void> {
  const started = Date.now();

  while (!predicate()) {
    if (Date.now() - started > timeout) throw new Error('Timed out waiting for the condition');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/*
 * The socket on a real connection, over TLS to the mock device: what needs a handshake. The rest of the socket is
 * tested on a fake connection in device-socket.unit.test.ts.
 */

describe('v2/DeviceSocket', () => {
  let server: MockWebSocketServer;
  let onConnection: (connection: MockWebSocketConnection) => void;
  const sockets: DeviceSocket<object>[] = [];

  const open = (options: WebSocketOptions = {}, token: string | undefined = mockV2Token) => {
    const p1 = new P1Meter(
      { host: server.host, identifier: mockTlsIdentifier, token },
      { ca: mockTlsCa },
    );
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

  it('should connect to /api/ws over TLS, authorize with the token, subscribe and emit the data', async () => {
    const socket = open();
    const onAuthorized = vi.fn();
    const onMeasurement = vi.fn();
    socket.on('authorized', onAuthorized).on('measurement', onMeasurement);
    socket.subscribe('measurement');

    await waitFor(() => socket.isAuthorized);
    const [connection] = server.connections;
    await waitFor(() => connection.received.length === 2);

    expect(onAuthorized).toHaveBeenCalledTimes(1);
    expect(connection.received).toStrictEqual([
      { type: 'authorization', data: mockV2Token },
      { type: 'subscribe', data: 'measurement' },
    ]);

    connection.send({ type: 'measurement', data: mockV2P1MeterMeasurement });
    await waitFor(() => onMeasurement.mock.calls.length === 1);

    expect(onMeasurement).toHaveBeenCalledWith(mockV2P1MeterMeasurement);
  });

  it('should report a rejected token after two drops in a row, and stop reconnecting', async () => {
    const socket = open({}, 'WRONG');
    const errors: HomeWizardError[] = [];
    socket.on('error', error => errors.push(error as HomeWizardError));

    await waitFor(() => errors.some(error => error.code === 'user:unauthorized'));
    await sleep(50);

    expect(server.connections).toHaveLength(2);
    expect(errors.filter(error => error.code === 'user:unauthorized')).toHaveLength(1);
    expect(socket.isAuthorized).toBe(false);
  });

  // undici's WebSocket reports a failed connection as an empty TypeError, without the TLS error, so a refused
  // certificate is a socket error here, where a request has a certificate error
  it.each([
    ['of another identifier', 'appliance/p1dongle/000000000000', mockTlsCa],
    ["the CA didn't sign", mockTlsIdentifier, undefined],
  ])(
    'should report a certificate %s as a socket error and not authorize',
    async (_, identifier, ca) => {
      const p1 = new P1Meter({ host: server.host, identifier, token: mockV2Token }, { ca });
      const socket = p1.openWebSocket({ reconnect: false });
      sockets.push(socket as DeviceSocket<object>);
      const onError = vi.fn<(error: HomeWizardError) => void>();
      socket.on('error', onError);

      await waitFor(() => onError.mock.calls.length > 0);

      expect(onError.mock.calls[0][0]).toMatchObject({
        kind: 'socket',
        message: 'The WebSocket connection failed',
      });
      expect(server.connections).toHaveLength(0);
    },
  );

  it('should only offer the commands each device supports', () => {
    const credentials = { host: server.host, identifier: mockTlsIdentifier, token: mockV2Token };
    const options = { ca: mockTlsCa };
    const kwh = new KwhMeter1Phase(credentials, options).openWebSocket({ reconnect: false });
    const battery = new PlugInBattery(credentials, options).openWebSocket({ reconnect: false });
    sockets.push(kwh as DeviceSocket<object>, battery as DeviceSocket<object>);

    // The kWh meters can't identify, and their status LED isn't adjustable
    // @ts-expect-error identify() is not available on a kWh meter
    expect(kwh.identify).toBeUndefined();
    // @ts-expect-error status_led_brightness_pct is not writable on a kWh meter
    kwh.set('system', { status_led_brightness_pct: 50 });

    // cloud_enabled is read-only on the battery, and the battery has no batteries topic
    // @ts-expect-error cloud_enabled is read-only on the Plug-In Battery
    battery.set('system', { cloud_enabled: false });
    // @ts-expect-error the Plug-In Battery has no batteries topic
    battery.set('batteries', { mode: 'zero' });
    expect(battery.identify).toBeTypeOf('function');
  });
});
