import type { MockInstance } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ConnectionOptions,
  Credentials,
  CredentialsStore,
  PairOptions,
} from 'homewizard-energy-api';
import { mockApiAgent } from '@/mocks/agent';
import { mockV2, mockV2Credentials } from '@/mocks/api-v2';
import {
  mockV2Batteries,
  mockV2DeviceInformation,
  mockV2KwhMeter3PhaseMeasurement,
  mockV2KwhMeterSystem,
  mockV2P1MeterMeasurement,
  mockV2P1MeterSystem,
  mockV2PlugInBatteryMeasurement,
  mockV2PlugInBatterySystem,
  mockV2Telegram,
  mockV2Token,
  mockV2UserCreated,
  mockV2Users,
} from '@/mocks/data/v2';
import { mockDiscoveryV2Response, mockMdnsV2Response } from '@/mocks/mdns-v2';
import { mockTlsCa, mockTlsIdentifier } from '@/mocks/tls/server';
import {
  authorizeLikeADevice,
  MockWebSocketServer,
  startMockWebSocketServer,
} from '@/mocks/tls/websocket-server';
import { createMemoryStore } from '../credentials-store';
import { parseTelegram } from '../telegram';

/*
 * Runs each example in this folder against the mocked device, as a user would run it with tsx: the examples import
 * the package by its name, and this mock of the package only adds what the tests need to reach the mocks. The
 * device classes, pair() and connect() get the mock dispatcher (or the test CA, for the WebSocket), and
 * createFileStore('devices.json') is a memory store, so the tests write no files.
 */

const mocked = vi.hoisted(() => ({
  options: {} as ConnectionOptions,
  store: undefined as unknown as CredentialsStore,
  mdnsResponses: [] as unknown[],
  mdnsStarted: false,
}));

vi.mock('homewizard-energy-api', async () => {
  const library = await vi.importActual<typeof import('@/index')>('@/index');

  type DeviceClass = new (credentials: Credentials, options?: ConnectionOptions) => object;

  // Adds the mock options to the options the example passes
  const withMockOptions = <T extends DeviceClass>(DeviceClass: T): T =>
    new Proxy(DeviceClass, {
      construct: (Target, [credentials, options]) =>
        new Target(credentials, { ...options, ...mocked.options }),
    });

  return {
    ...library,
    P1Meter: withMockOptions(library.P1Meter),
    KwhMeter1Phase: withMockOptions(library.KwhMeter1Phase),
    KwhMeter3Phase: withMockOptions(library.KwhMeter3Phase),
    PlugInBattery: withMockOptions(library.PlugInBattery),
    pair: (host: string, name: string, options?: PairOptions) =>
      library.pair(host, name, {
        ...options,
        ...mocked.options,
        identifier: mockV2Credentials.identifier,
      }),
    connect: (...[found, credentials, options]: Parameters<typeof library.connect>) =>
      library.connect(found, credentials, { ...options, ...mocked.options }),
    createFileStore: (path: string) => {
      if (path !== 'devices.json')
        throw new Error(`The examples store in devices.json, not ${path}`);
      return mocked.store;
    },
  };
});

vi.mock('multicast-dns', () => ({
  default: () => {
    mocked.mdnsStarted = true;

    return {
      query: vi.fn(),
      on: (event: string, handler: (packet: unknown) => void) => {
        if (event !== 'response') return;
        for (const packet of mocked.mdnsResponses) queueMicrotask(() => handler(packet));
      },
      removeAllListeners: vi.fn(),
      destroy: vi.fn(),
    };
  },
}));

let log: MockInstance<typeof console.log>;

/** The real setTimeout, taken before the fake timers replace it in each test. */
const realSetTimeout = globalThis.setTimeout;

/**
 * Runs an example that waits on timers, such as a poll interval or the discovery timeout. Loading the example, and
 * the mDNS module it loads, takes real time: the fake timers only move on once `ready()` is true and the example has
 * a timer pending.
 */
async function runWithTimers(
  run: Promise<unknown>,
  ready: () => boolean = () => true,
  maxMs = 60000,
): Promise<void> {
  let done = false;
  const settled = run.finally(() => {
    done = true;
  });

  for (let elapsed = 0; !done && elapsed < maxMs;) {
    if (ready() && vi.getTimerCount() > 0) {
      await vi.advanceTimersByTimeAsync(100);
      elapsed += 100;
    } else {
      await new Promise(resolve => realSetTimeout(resolve, 1));
    }
  }

  await settled;
}

/** The lines the example printed. */
const printed = () => log.mock.calls.map(args => args.join(' '));

beforeEach(async () => {
  // Each test runs its example again
  vi.resetModules();
  mocked.options = { dispatcher: mockApiAgent };
  mocked.store = createMemoryStore();
  mocked.mdnsResponses = [];
  mocked.mdnsStarted = false;
  await mocked.store.set('p1', mockV2Credentials);
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  log.mockRestore();
  mockApiAgent.assertNoPendingInterceptors();
});

describe('examples', () => {
  it('pair.ts pairs and stores the credentials as "p1"', async () => {
    await mocked.store.delete('p1');
    mockV2('/api/user', 'POST', {
      statusCode: 403,
      response: { error: 'user:creation-not-enabled' },
    });
    mockV2('/api/user', 'POST', { response: mockV2UserCreated });

    await runWithTimers(import('./pair'));

    expect(await mocked.store.get('p1')).toStrictEqual({
      ...mockV2Credentials,
      token: mockV2UserCreated.token,
    });
    expect(printed()).toStrictEqual([
      'Press the button on the device (120s left)',
      'Press the button on the device (118s left)',
      `Paired with ${mockV2Credentials.identifier}, stored as "p1" in devices.json`,
    ]);
  });

  it('read-energy-usage.ts prints the measurement', async () => {
    mockV2('/api/measurement', 'GET', { response: mockV2P1MeterMeasurement });

    await import('./read-energy-usage');

    expect(printed()).toStrictEqual([
      `Using ${mockV2P1MeterMeasurement.power_w} W`,
      `Imported ${mockV2P1MeterMeasurement.energy_import_kwh} kWh, exported ${mockV2P1MeterMeasurement.energy_export_kwh} kWh`,
      ...(mockV2P1MeterMeasurement.external ?? []).map(
        meter => `${meter.type}: ${meter.value} ${meter.unit}`,
      ),
    ]);
  });

  it('poll.ts prints 10 measurements, one each second', async () => {
    for (let i = 0; i < 10; i++) {
      mockV2('/api/measurement', 'GET', { response: { ...mockV2P1MeterMeasurement, power_w: i } });
    }

    await runWithTimers(import('./poll'));

    expect(printed()).toStrictEqual(Array.from({ length: 10 }, (_, i) => `${i} W`));
  });

  it('find-device.ts stores the address the paired device has now', async () => {
    const credentials = {
      ...mockV2Credentials,
      host: '192.168.1.99',
      identifier: mockDiscoveryV2Response.txt.id!,
    };
    await mocked.store.set('p1', credentials);
    mocked.mdnsResponses = [mockMdnsV2Response];

    await import('./find-device');

    expect(await mocked.store.get('p1')).toStrictEqual({
      ...credentials,
      host: mockDiscoveryV2Response.ip,
    });
    expect(printed()).toStrictEqual([
      `Found ${credentials.identifier} at ${mockDiscoveryV2Response.ip}`,
    ]);
  });

  it("find-device.ts says when the paired device isn't on the network", async () => {
    mocked.mdnsResponses = [mockMdnsV2Response];

    await runWithTimers(import('./find-device'), () => mocked.mdnsStarted);

    expect(await mocked.store.get('p1')).toStrictEqual(mockV2Credentials);
    expect(printed()).toStrictEqual([`${mockV2Credentials.identifier} isn't on the network`]);
  });

  it('expired-token.ts deletes the credentials when the token stopped working', async () => {
    mockV2('/api/measurement', 'GET', {
      statusCode: 401,
      response: { error: 'user:unauthorized' },
    });

    await import('./expired-token');

    expect(await mocked.store.get('p1')).toBeUndefined();
    expect(printed()).toStrictEqual([
      'The token stopped working: run src/examples/pair.ts to pair again',
    ]);
  });

  it('batteries.ts changes the permissions, and puts them back', async () => {
    const bodies: unknown[] = [];
    mockV2('/api/batteries', 'GET', { response: mockV2Batteries });
    mockV2('/api/batteries', 'PUT', {
      response: { ...mockV2Batteries, permissions: ['charge_allowed'] },
      onRequest: ({ body }) => bodies.push(body),
    });
    mockV2('/api/batteries', 'PUT', {
      response: mockV2Batteries,
      onRequest: ({ body }) => bodies.push(body),
    });

    await import('./batteries');

    expect(bodies).toStrictEqual([
      { permissions: ['charge_allowed'] },
      { permissions: mockV2Batteries.permissions },
    ]);
    expect(printed()).toStrictEqual([
      `${mockV2Batteries.battery_count} batteries in mode ${mockV2Batteries.mode}, at ${mockV2Batteries.power_w} W`,
      'Permissions: charge_allowed',
    ]);
  });

  it('settings.ts sets the status LED, blinks it, and puts it back', async () => {
    const bodies: unknown[] = [];
    mockV2('/api/system', 'GET', { response: mockV2P1MeterSystem });
    mockV2('/api/system', 'PUT', {
      response: mockV2P1MeterSystem,
      onRequest: ({ body }) => bodies.push(body),
    });
    mockV2('/api/system/identify', 'PUT');
    mockV2('/api/system', 'PUT', {
      response: mockV2P1MeterSystem,
      onRequest: ({ body }) => bodies.push(body),
    });

    await import('./settings');

    expect(bodies).toStrictEqual([
      { status_led_brightness_pct: 50 },
      { status_led_brightness_pct: mockV2P1MeterSystem.status_led_brightness_pct },
    ]);
    expect(printed()).toStrictEqual([
      `The status LED is at ${mockV2P1MeterSystem.status_led_brightness_pct}%`,
      'Set the status LED to 50%, and blinked it',
    ]);
  });

  it('telegram.ts prints the parsed telegram', async () => {
    mockV2('/api/telegram', 'GET', { response: mockV2Telegram });

    await import('./telegram');

    const telegram = parseTelegram(mockV2Telegram);
    expect(printed()).toStrictEqual([
      `${telegram.meter.brand} ${telegram.meter.model}`,
      `Tariff 1: ${telegram.power.import.t1.value} ${telegram.power.import.t1.unit}`,
    ]);
  });

  it('p1-meter.ts prints what the P1 meter has', async () => {
    mockV2('/api', 'GET', { response: mockV2DeviceInformation['HWE-P1'] });
    mockV2('/api/measurement', 'GET', { response: mockV2P1MeterMeasurement });
    mockV2('/api/system', 'GET', { response: mockV2P1MeterSystem });
    mockV2('/api/telegram', 'GET', { response: mockV2Telegram });
    mockV2('/api/user', 'GET', { response: mockV2Users });

    await import('./p1-meter');

    expect(log.mock.calls).toStrictEqual([
      [mockV2DeviceInformation['HWE-P1']],
      [mockV2P1MeterMeasurement],
      [mockV2P1MeterSystem],
      [mockV2Telegram],
      [mockV2Users],
    ]);
  });

  it('kwh-meter.ts prints what the kWh meter has', async () => {
    await mocked.store.set('kwhMeter', mockV2Credentials);
    mockV2('/api/measurement', 'GET', { response: mockV2KwhMeter3PhaseMeasurement });
    mockV2('/api/system', 'GET', { response: mockV2KwhMeterSystem });
    mockV2('/api/batteries', 'GET', { response: mockV2Batteries });

    await import('./kwh-meter');

    expect(log.mock.calls).toStrictEqual([
      [
        `${mockV2KwhMeter3PhaseMeasurement.power_w} W (L1 ${mockV2KwhMeter3PhaseMeasurement.power_l1_w} W)`,
      ],
      [mockV2KwhMeterSystem],
      [mockV2Batteries],
    ]);
  });

  it('plug-in-battery.ts prints what the battery has', async () => {
    await mocked.store.set('battery', mockV2Credentials);
    mockV2('/api/measurement', 'GET', { response: mockV2PlugInBatteryMeasurement });
    mockV2('/api/system', 'GET', { response: mockV2PlugInBatterySystem });

    await import('./plug-in-battery');

    expect(log.mock.calls).toStrictEqual([
      [
        `${mockV2PlugInBatteryMeasurement.state_of_charge_pct}% charged, ${mockV2PlugInBatteryMeasurement.power_w} W`,
      ],
      [mockV2PlugInBatterySystem],
    ]);
  });

  it('discovery.ts lists the devices it finds in 10 seconds', async () => {
    mocked.mdnsResponses = [mockMdnsV2Response];
    const { ip, txt } = mockDiscoveryV2Response;

    await runWithTimers(import('./discovery'), () => mocked.mdnsStarted);

    expect(printed()).toStrictEqual([
      `${ip} ${txt.product_type} ${txt.id} (API ${txt.api_version})`,
    ]);
  });

  it.each(['read-energy-usage', 'live-updates', 'expired-token', 'kwh-meter', 'plug-in-battery'])(
    "%s.ts asks to pair first when the device isn't stored",
    async name => {
      await mocked.store.delete('p1');

      await expect(import(`./${name}.ts`)).rejects.toThrow(
        /^Pair the .+ first: npx tsx src\/examples\/pair\.ts$/,
      );
    },
  );
});

/* The WebSocket examples need a real TLS handshake, which the mock dispatcher skips: they use the mock device. */
describe('examples on the WebSocket', () => {
  let server: MockWebSocketServer;
  const measurements = Array.from({ length: 10 }, (_, i) => ({
    ...mockV2P1MeterMeasurement,
    power_w: i,
  }));

  beforeEach(async () => {
    vi.useRealTimers();

    server = await startMockWebSocketServer(connection => {
      authorizeLikeADevice(connection, mockV2Token);
      // Pushes a measurement every 20ms, like a device does each second: a stream keeps only the newest one
      // while the loop is busy, so a burst would skip some
      connection.on('message', message => {
        if (message.type !== 'subscribe') return;

        let sent = 0;
        const timer = setInterval(() => {
          if (sent === measurements.length) return clearInterval(timer);
          connection.send({ type: 'measurement', data: measurements[sent++] });
        }, 20);
        connection.on('close', () => clearInterval(timer));
      });
    });

    mocked.options = { ca: mockTlsCa };
    await mocked.store.set('p1', {
      host: server.host,
      identifier: mockTlsIdentifier,
      token: mockV2Token,
    });
  });

  afterEach(async () => {
    await server.close();
    // The global afterEach in vitest.setup.ts runs the fake timers
    vi.useFakeTimers();
  });

  it('live-updates.ts prints 10 measurements as the device pushes them, and closes', async () => {
    await import('./live-updates');

    expect(printed()).toStrictEqual(measurements.map(({ power_w }) => `${power_w} W`));
  });

  it('websocket.ts prints 10 measurements from the events, and closes', async () => {
    await import('./websocket');
    await vi.waitFor(() => expect(printed()).toContain('Closed'));

    expect(printed()).toStrictEqual([
      'Authorized',
      ...measurements.map(({ power_w }) => `${power_w} W`),
      'Closed',
    ]);
  });
});

describe('the README', () => {
  const root = join(__dirname, '..', '..');
  const readme = readFileSync(join(root, 'README.md'), 'utf8');

  it('links each recipe to its full script', () => {
    const recipes = readme
      .split(/^## /m)
      .filter(section => section.startsWith('Recipes'))
      .flatMap(section => section.split(/^### /m).slice(1));

    expect(recipes.length).toBeGreaterThanOrEqual(8);
    for (const recipe of recipes) {
      expect(recipe, `The recipe "${recipe.split('\n')[0]}"`).toMatch(
        /\[Full script[^\]]*\]\(https:\/\/github\.com\/[^)]+\/blob\/main\/src\/examples\//,
      );
    }
  });

  it('links only to scripts that exist', () => {
    const scripts = [...readme.matchAll(/\/blob\/main\/(src\/examples\/[^)\s]+)\)/g)].map(
      match => match[1],
    );

    expect(scripts.length).toBeGreaterThanOrEqual(9);
    for (const script of scripts) expect(existsSync(join(root, script)), script).toBe(true);
  });
});
