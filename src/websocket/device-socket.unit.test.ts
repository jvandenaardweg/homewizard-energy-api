import { mockApiAgent } from '@/mocks/agent';
import { mockV2P1MeterMeasurement } from '@/mocks/data/v2';
import { FakeConnection } from '@/mocks/websocket-connection';
import { HomeWizardError } from '../errors';
import { BatteriesUpdate, P1MeterMeasurement, P1MeterSystem, P1MeterSystemUpdate } from '../types';
import { BatteriesTopic, CommonTopics, IdentifiableDeviceSocket, WebSocketOptions } from '.';

/*
 * The socket on a fake connection, with fake timers: subscriptions, the queue, reconnecting, giving up and
 * streams. The connection itself is tested in connection.test.ts, and the real one over TLS in
 * device-socket.test.ts.
 */

type Topics = CommonTopics<P1MeterMeasurement, P1MeterSystem> & BatteriesTopic;
type Updates = { system: P1MeterSystemUpdate; batteries: BatteriesUpdate };

class TestSocket extends IdentifiableDeviceSocket<Topics, Updates> {
  protected readonly connectionClass = FakeConnection;
}

const target = {
  url: 'wss://192.168.1.35/api/ws',
  token: 'TOKEN',
  dispatcher: mockApiAgent,
  logger: undefined,
};

function open(options: WebSocketOptions = {}, logger?: { method: () => void }) {
  const socket = new TestSocket({ ...target, logger }, { reconnectDelay: 10, ...options });
  socket.connect();
  return socket;
}

/** The subscriptions and commands sent on a connection. */
const sent = (connection = FakeConnection.last) => connection.sent;

describe('v2/DeviceSocket', () => {
  beforeEach(() => {
    FakeConnection.instances = [];
  });

  it('should open a connection with the target and the heartbeat interval', () => {
    const socket = new TestSocket(target);
    socket.connect();
    open({ heartbeatInterval: 0 });

    const [first, second] = FakeConnection.instances;
    expect(first.target).toBe(target);
    expect(first.heartbeatInterval).toBe(30000);
    expect(second.heartbeatInterval).toBe(0);
  });

  it('should queue commands until authorized, then send them right away', () => {
    const socket = open();
    socket.request('system');
    socket.set('batteries', { mode: 'zero' });
    expect(sent()).toStrictEqual([]);

    FakeConnection.last.authorize();
    socket.identify();
    socket.subscribe('*');
    socket.unsubscribe('*');

    expect(sent()).toStrictEqual([
      { type: 'system' },
      { type: 'batteries', data: { mode: 'zero' } },
      { type: 'identify' },
      { type: 'subscribe', data: '*' },
      { type: 'unsubscribe', data: '*' },
    ]);
  });

  it('should subscribe on authorizing, before the queued commands, then emit authorized', () => {
    const socket = open();
    const onAuthorized = vi.fn(() => expect(sent()).toHaveLength(2));
    socket.on('authorized', onAuthorized);
    socket.request('system');
    socket.subscribe('measurement');

    FakeConnection.last.authorize();

    expect(onAuthorized).toHaveBeenCalledTimes(1);
    expect(socket.isAuthorized).toBe(true);
    expect(sent()).toStrictEqual([{ type: 'subscribe', data: 'measurement' }, { type: 'system' }]);
  });

  it('should not queue a subscription that was removed before authorizing', () => {
    const socket = open();
    socket.subscribe('measurement');
    socket.unsubscribe('measurement');

    FakeConnection.last.authorize();

    expect(sent()).toStrictEqual([]);
  });

  it('should emit every message, and the data of a topic, but not the authorization as a topic', () => {
    const socket = open();
    const onMessage = vi.fn();
    const onMeasurement = vi.fn();
    const onAuthorizedTopic = vi.fn();
    socket.on('message', onMessage).on('measurement', onMeasurement);
    socket.on('authorization_requested' as 'measurement', onAuthorizedTopic);

    FakeConnection.last.authorize();
    FakeConnection.last.receive({ type: 'measurement', data: mockV2P1MeterMeasurement });

    expect(onMessage.mock.calls.map(([message]) => message.type)).toStrictEqual([
      'authorization_requested',
      'authorized',
      'measurement',
    ]);
    expect(onMeasurement).toHaveBeenCalledExactlyOnceWith(mockV2P1MeterMeasurement);
    expect(onAuthorizedTopic).not.toHaveBeenCalled();
  });

  it('should emit the errors of the connection', () => {
    const socket = open();
    const onError = vi.fn();
    socket.on('error', onError);
    const error = new HomeWizardError('socket', 'Received a message that is not JSON: not json');

    FakeConnection.last.error(error);

    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
  });

  it('should emit error messages from the device with their code', () => {
    const socket = open();
    const onError = vi.fn();
    socket.on('error', onError);
    FakeConnection.last.authorize();

    FakeConnection.last.receive({
      type: 'error',
      data: { message: 'json:parameter-invalid-type:status_led_brightness_pct' },
    });
    FakeConnection.last.receive({ type: 'error', data: 'something' });

    expect(onError.mock.calls[0][0]).toBeInstanceOf(HomeWizardError);
    expect(onError.mock.calls[0][0].code).toBe(
      'json:parameter-invalid-type:status_led_brightness_pct',
    );
    expect(onError.mock.calls[1][0].message).toBe('The device sent an error: "something"');
    expect(socket.isAuthorized).toBe(true);
  });

  it('should close for an unauthorized error message, and not reconnect', async () => {
    const socket = open();
    const onError = vi.fn();
    const onClose = vi.fn();
    socket.on('error', onError).on('close', onClose);
    FakeConnection.last.authorize();

    FakeConnection.last.receive({ type: 'error', data: { message: 'user:unauthorized' } });
    await vi.advanceTimersByTimeAsync(1000);

    expect(onError.mock.calls[0][0].code).toBe('user:unauthorized');
    expect(onClose).toHaveBeenCalledExactlyOnceWith(1000, 'closed');
    expect(FakeConnection.last.closedWith).toBe(1000);
    expect(FakeConnection.instances).toHaveLength(1);
  });

  it('should emit an error and close without a token, and not reconnect', async () => {
    const socket = open();
    const events: unknown[] = [];
    socket.on('error', error => events.push(['error', error]));
    socket.on('close', (code, reason) => events.push(['close', code, reason]));

    FakeConnection.last.drop('missing-token', 1000, 'closed');
    await vi.advanceTimersByTimeAsync(1000);

    expect(events).toStrictEqual([
      [
        'error',
        new HomeWizardError(
          'socket',
          'The device asks for a token, but there is none. Pair first, and pass the token.',
          { code: 'user:unauthorized' },
        ),
      ],
      ['close', 1000, 'closed'],
    ]);
    expect(FakeConnection.instances).toHaveLength(1);
  });

  it('should report a rejected token after two drops in a row, and stop reconnecting', async () => {
    const socket = open();
    const events: unknown[] = [];
    socket.on('error', error => events.push(['error', error.code, error.message]));
    socket.on('close', (code, reason) => events.push(['close', code, reason]));

    FakeConnection.last.drop('rejected-token');
    await vi.advanceTimersByTimeAsync(10);
    FakeConnection.last.drop('rejected-token', 1006, 'lost');
    await vi.advanceTimersByTimeAsync(1000);

    expect(events).toStrictEqual([
      ['close', 1006, ''],
      [
        'error',
        'user:unauthorized',
        'The device closed the connection after the token was sent, so the token is probably invalid',
      ],
      ['close', 1006, 'lost'],
    ]);
    expect(FakeConnection.instances).toHaveLength(2);
    expect(socket.isAuthorized).toBe(false);
  });

  it('should reconnect after a single rejected-token drop, like a network blip', async () => {
    const socket = open();
    const onError = vi.fn();
    socket.on('error', onError);

    FakeConnection.last.drop('rejected-token');
    await vi.advanceTimersByTimeAsync(10);
    FakeConnection.last.drop('dropped');
    await vi.advanceTimersByTimeAsync(20);
    FakeConnection.last.drop('rejected-token');
    await vi.advanceTimersByTimeAsync(40);
    FakeConnection.last.authorize();

    expect(FakeConnection.instances).toHaveLength(4);
    expect(onError).not.toHaveBeenCalled();
    expect(socket.isAuthorized).toBe(true);
  });

  it('should reconnect after a drop and subscribe again', async () => {
    const socket = open();
    socket.subscribe('measurement');
    const onClose = vi.fn();
    socket.on('close', onClose);
    FakeConnection.last.authorize();

    FakeConnection.last.drop('dropped', 1006, 'network down');
    expect(socket.isAuthorized).toBe(false);
    await vi.advanceTimersByTimeAsync(10);
    FakeConnection.last.authorize();

    expect(onClose).toHaveBeenCalledExactlyOnceWith(1006, 'network down');
    expect(FakeConnection.instances).toHaveLength(2);
    expect(sent()).toStrictEqual([{ type: 'subscribe', data: 'measurement' }]);
  });

  it('should reconnect after a drop before the token was sent', async () => {
    open();

    FakeConnection.last.drop('dropped', 1006, 'network down');
    await vi.advanceTimersByTimeAsync(10);

    expect(FakeConnection.instances).toHaveLength(2);
  });

  it('should back off between failed reconnects, and start over once authorized', async () => {
    const method = vi.fn();
    open({ reconnectDelay: 10, maxReconnectDelay: 15 }, { method });

    FakeConnection.last.drop();
    await vi.advanceTimersByTimeAsync(9);
    expect(FakeConnection.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    FakeConnection.last.drop();
    await vi.advanceTimersByTimeAsync(15);
    FakeConnection.last.authorize();
    FakeConnection.last.drop();

    const logged = JSON.stringify(method.mock.calls);
    expect(logged).toContain('Connection closed (1006)');
    expect(logged).toContain('Reconnecting in 10ms');
    expect(logged).toContain('Reconnecting in 15ms');
    expect(logged.indexOf('Reconnecting in 10ms')).not.toBe(
      logged.lastIndexOf('Reconnecting in 10ms'),
    );
  });

  it('should not reconnect with reconnect: false', async () => {
    const socket = open({ reconnect: false });
    const onClose = vi.fn();
    socket.on('close', onClose);
    FakeConnection.last.authorize();

    FakeConnection.last.drop();
    await vi.advanceTimersByTimeAsync(1000);

    expect(onClose).toHaveBeenCalledExactlyOnceWith(1006, '');
    expect(FakeConnection.instances).toHaveLength(1);
  });

  it('should hide the answer to a heartbeat, but emit it as a message', () => {
    const socket = open();
    const onDevice = vi.fn();
    const onMessage = vi.fn();
    socket.on('device', onDevice).on('message', onMessage);
    FakeConnection.last.authorize();

    FakeConnection.last.receive({ type: 'device', data: { serial: 'x' } }, 'heartbeat');

    expect(onDevice).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenLastCalledWith({ type: 'device', data: { serial: 'x' } });

    FakeConnection.last.receive({ type: 'device', data: { serial: 'y' } });
    expect(onDevice).toHaveBeenCalledExactlyOnceWith({ serial: 'y' });
  });

  it('should pass the heartbeat answer on when subscribed to the device, or to everything', () => {
    const device = open();
    const all = open();
    const onDevice = vi.fn();
    device.on('device', onDevice).subscribe('device');
    all.on('device', onDevice).subscribe('*');

    for (const connection of FakeConnection.instances) {
      connection.authorize();
      connection.receive({ type: 'device', data: { serial: 'x' } }, 'heartbeat');
    }

    expect(onDevice.mock.calls).toStrictEqual([[{ serial: 'x' }], [{ serial: 'x' }]]);
  });

  it('should reconnect when the connection closes for no response', async () => {
    const socket = open();
    const onClose = vi.fn();
    socket.on('close', onClose);
    FakeConnection.last.authorize();

    FakeConnection.last.drop('no-response');
    await vi.advanceTimersByTimeAsync(10);

    expect(onClose).toHaveBeenCalledExactlyOnceWith(1006, 'no response');
    expect(FakeConnection.instances).toHaveLength(2);
  });

  it('should stay closed when a listener closes it from the message of the authorization', async () => {
    const socket = open();
    const onAuthorized = vi.fn();
    socket.on('authorized', onAuthorized);
    socket.on('message', message => {
      if (message.type === 'authorized') socket.close();
    });

    FakeConnection.last.authorize();
    await vi.advanceTimersByTimeAsync(1000);

    expect(socket.isAuthorized).toBe(false);
    expect(onAuthorized).not.toHaveBeenCalled();
    expect(FakeConnection.instances).toHaveLength(1);
  });

  it('should close on close(), emit close once and ignore a second connect while connected', async () => {
    const socket = open();
    const onClose = vi.fn();
    socket.on('close', onClose);
    FakeConnection.last.authorize();

    socket.connect();
    socket.close();
    socket.close();
    await vi.advanceTimersByTimeAsync(1000);

    expect(onClose).toHaveBeenCalledExactlyOnceWith(1000, 'closed');
    expect(FakeConnection.last.closedWith).toBe(1000);
    expect(FakeConnection.instances).toHaveLength(1);
  });

  it('should not reconnect after close() while it waits to reconnect', async () => {
    const socket = open();
    FakeConnection.last.drop();

    socket.close();
    await vi.advanceTimersByTimeAsync(1000);

    expect(FakeConnection.instances).toHaveLength(1);
  });

  it('should remove a listener with off()', () => {
    const socket = open();
    const onMessage = vi.fn();
    socket.on('message', onMessage).off('message', onMessage);

    FakeConnection.last.authorize();

    expect(onMessage).not.toHaveBeenCalled();
  });

  describe('stream()', () => {
    it('should subscribe, yield the data of the topic, and unsubscribe after a break', async () => {
      const socket = open();
      const stream = socket.stream('measurement');
      FakeConnection.last.authorize();

      expect(sent()).toStrictEqual([{ type: 'subscribe', data: 'measurement' }]);

      FakeConnection.last.receive({ type: 'measurement', data: mockV2P1MeterMeasurement });

      for await (const measurement of stream) {
        expect(measurement).toStrictEqual(mockV2P1MeterMeasurement);
        break;
      }

      expect(sent()[1]).toStrictEqual({ type: 'unsubscribe', data: 'measurement' });
    });

    it('should keep a subscription it did not make, and one another listener still uses', async () => {
      const socket = open();
      socket.subscribe('system');
      const own = socket.stream('system');
      const first = socket.stream('measurement');
      const second = socket.stream('measurement');
      FakeConnection.last.authorize();

      await own.return?.();
      await first.return?.();

      expect(sent()).toStrictEqual([
        { type: 'subscribe', data: 'system' },
        { type: 'subscribe', data: 'measurement' },
      ]);

      await second.return?.();
      expect(sent()[2]).toStrictEqual({ type: 'unsubscribe', data: 'measurement' });
    });

    it('should keep a subscription an on() listener still uses, and unsubscribe once it is gone', async () => {
      const socket = open();
      const listener = vi.fn();
      socket.on('measurement', listener);
      const first = socket.stream('measurement');
      FakeConnection.last.authorize();

      await first.return?.();
      expect(sent()).toStrictEqual([{ type: 'subscribe', data: 'measurement' }]);

      socket.off('measurement', listener);
      const second = socket.stream('measurement');
      await second.return?.();

      expect(sent()).toStrictEqual([
        { type: 'subscribe', data: 'measurement' },
        { type: 'unsubscribe', data: 'measurement' },
      ]);
    });

    it('should subscribe again when the topic was unsubscribed while a stream runs', async () => {
      const socket = open();
      const first = socket.stream('measurement');
      FakeConnection.last.authorize();
      socket.unsubscribe('measurement');

      const second = socket.stream('measurement');
      await first.return?.();
      await second.return?.();

      expect(sent()).toStrictEqual([
        { type: 'subscribe', data: 'measurement' },
        { type: 'unsubscribe', data: 'measurement' },
        { type: 'subscribe', data: 'measurement' },
        { type: 'unsubscribe', data: 'measurement' },
      ]);
    });

    it('should not subscribe again when subscribed to everything', async () => {
      const socket = open();
      socket.subscribe('*');
      const stream = socket.stream('measurement');
      FakeConnection.last.authorize();

      expect(sent()).toStrictEqual([{ type: 'subscribe', data: '*' }]);
      await stream.return?.();
    });

    it('should end when the signal aborts, or was aborted already', async () => {
      const socket = open();
      const controller = new AbortController();
      const next = socket.stream('measurement', { signal: controller.signal }).next();

      controller.abort();

      await expect(next).resolves.toStrictEqual({ value: undefined, done: true });
      await expect(
        socket.stream('system', { signal: AbortSignal.abort() }).next(),
      ).resolves.toStrictEqual({ value: undefined, done: true });
    });

    it('should end on close(), and keep going while the socket reconnects', async () => {
      const socket = open();
      const stream = socket.stream('measurement');
      const next = stream.next();
      FakeConnection.last.authorize();

      FakeConnection.last.drop();
      await vi.advanceTimersByTimeAsync(10);
      FakeConnection.last.authorize();
      FakeConnection.last.receive({ type: 'measurement', data: mockV2P1MeterMeasurement });

      await expect(next).resolves.toStrictEqual({ value: mockV2P1MeterMeasurement, done: false });

      socket.close();
      await expect(stream.next()).resolves.toStrictEqual({ value: undefined, done: true });
    });

    it('should end on close() while the socket waits to reconnect', async () => {
      const socket = open({ reconnectDelay: 5000 });
      const next = socket.stream('measurement').next();
      FakeConnection.last.authorize();

      FakeConnection.last.drop();
      socket.close();

      await expect(next).resolves.toStrictEqual({ value: undefined, done: true });
    });

    it('should end when the connection drops without reconnect', async () => {
      const socket = open({ reconnect: false });
      const stream = socket.stream('measurement');
      FakeConnection.last.authorize();

      FakeConnection.last.drop();

      await expect(stream.next()).resolves.toStrictEqual({ value: undefined, done: true });
    });

    it('should end straight away on a socket that closed for good', async () => {
      const closed = open();
      closed.close();
      const dropped = open({ reconnect: false });
      FakeConnection.last.authorize();
      FakeConnection.last.drop();

      await expect(closed.stream('measurement').next()).resolves.toStrictEqual({
        value: undefined,
        done: true,
      });
      await expect(dropped.stream('measurement').next()).resolves.toStrictEqual({
        value: undefined,
        done: true,
      });
    });

    it('should throw straight away on a socket that stopped for a rejected token', async () => {
      const socket = open();
      FakeConnection.last.drop('rejected-token');
      await vi.advanceTimersByTimeAsync(10);
      FakeConnection.last.drop('rejected-token');

      await expect(socket.stream('measurement').next()).rejects.toMatchObject({
        code: 'user:unauthorized',
      });
    });

    it('should throw for a missing or rejected token', async () => {
      const missingSocket = open();
      const missing = missingSocket.stream('measurement');
      const missingConnection = FakeConnection.last;
      const rejectedSocket = open();
      const rejected = rejectedSocket.stream('measurement');

      missingConnection.drop('missing-token', 1000, 'closed');
      FakeConnection.last.drop('rejected-token');
      await vi.advanceTimersByTimeAsync(10);
      FakeConnection.last.drop('rejected-token');

      await expect(missing.next()).rejects.toMatchObject({
        kind: 'socket',
        code: 'user:unauthorized',
        message: expect.stringMatching(/there is none/),
      });
      await expect(rejected.next()).rejects.toMatchObject({
        kind: 'socket',
        code: 'user:unauthorized',
        message: expect.stringMatching(/probably invalid/),
      });
    });

    it('should throw when the device sends a user:unauthorized error', async () => {
      const socket = open();
      const next = socket.stream('measurement').next();
      FakeConnection.last.authorize();

      FakeConnection.last.receive({ type: 'error', data: { message: 'user:unauthorized' } });

      await expect(next).rejects.toMatchObject({
        kind: 'socket',
        code: 'user:unauthorized',
        message: 'The device sent an error: user:unauthorized',
      });
    });
  });
});
