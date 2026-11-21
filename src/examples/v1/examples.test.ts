import type { MockInstance } from 'vitest';
import { mockApiAgent } from '@/mocks/agent';
import { mockTelegramResponse } from '@/mocks/data/telegram';
import {
  mockEnergySocketDataResponse,
  mockKwhMeter1PhaseResponse,
  mockKwhMeter3PhaseResponse,
  mockP1MeterDataResponse,
  mockWaterMeterDataResponse,
} from '@/mocks/v1/data/data';
import { mockStateResponse } from '@/mocks/v1/data/state';
import { mockDiscoveryResponse, mockMdnsResponse } from '@/mocks/v1/mdns';
import { parseTelegram } from '../../telegram';

/*
 * Runs each API v1 example in this folder against the mocked device, as a user would run it with tsx. The API v1
 * uses the global dispatcher, which vitest.setup.ts sets to the mock agent, so the examples need no changes.
 */

const mocked = vi.hoisted(() => ({ mdnsResponses: [] as unknown[] }));

vi.mock('multicast-dns', () => ({
  default: () => ({
    query: vi.fn(),
    on: (event: string, handler: (packet: unknown) => void) => {
      if (event !== 'response') return;
      for (const packet of mocked.mdnsResponses) queueMicrotask(() => handler(packet));
    },
    removeAllListeners: vi.fn(),
    destroy: vi.fn(),
  }),
}));

const JSON_HEADERS = { 'content-type': 'application/json' };

/** Intercepts `times` requests to a device at `host`. */
function mockDevice(
  host: string,
  path: string,
  method: 'GET' | 'PUT',
  response: object | string,
  { times = 1, onBody }: { times?: number; onBody?: (body: unknown) => void } = {},
) {
  mockApiAgent
    .get(`http://${host}`)
    .intercept({ path, method })
    .reply(({ body }) => {
      if (typeof body === 'string') onBody?.(JSON.parse(body));
      return typeof response === 'string'
        ? {
            statusCode: 200,
            data: response,
            responseOptions: { headers: { 'content-type': 'text/plain' } },
          }
        : {
            statusCode: 200,
            data: JSON.stringify(response),
            responseOptions: { headers: JSON_HEADERS },
          };
    })
    .times(times);
}

/** The real setTimeout, taken before the fake timers replace it in each test. */
const realSetTimeout = globalThis.setTimeout;

/** Runs an example that waits on timers: the fake timers move on while the example has a timer pending. */
async function runWithTimers(run: Promise<unknown>, maxMs = 60000): Promise<void> {
  let done = false;
  const settled = run.finally(() => {
    done = true;
  });

  for (let elapsed = 0; !done && elapsed < maxMs;) {
    if (vi.getTimerCount() > 0) {
      await vi.advanceTimersByTimeAsync(100);
      elapsed += 100;
    } else {
      await new Promise(resolve => realSetTimeout(resolve, 1));
    }
  }

  await settled;
}

/** Waits until the example stopped its last timer, for the examples that stop polling after a while. */
async function untilTimersStop(run: Promise<unknown>): Promise<void> {
  await run;
  while (vi.getTimerCount() > 0) await vi.advanceTimersByTimeAsync(100);
}

let log: MockInstance<typeof console.log>;
const printed = () => log.mock.calls.map(args => args.join(' '));

beforeEach(() => {
  vi.resetModules();
  mocked.mdnsResponses = [];
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  log.mockRestore();
  mockApiAgent.assertNoPendingInterceptors();
});

describe('examples of the API v1', () => {
  it('energy-socket.ts prints what the Energy Socket uses', async () => {
    mockDevice('192.168.1.10', '/api/v1/data', 'GET', mockEnergySocketDataResponse);

    await import('./energy-socket');

    const data = mockEnergySocketDataResponse;
    expect(printed()).toStrictEqual([
      `Using ${data.active_power_w} W at ${data.active_voltage_v} V`,
      `Imported ${data.total_power_import_kwh} kWh, exported ${data.total_power_export_kwh} kWh`,
    ]);
  });

  it('switch-energy-socket.ts switches the socket for 5 seconds, and back', async () => {
    const bodies: unknown[] = [];
    mockDevice('192.168.1.10', '/api/v1/state', 'GET', {
      ...mockStateResponse,
      power_on: true,
      switch_lock: false,
    });
    mockDevice(
      '192.168.1.10',
      '/api/v1/state',
      'PUT',
      { power_on: false },
      { onBody: body => bodies.push(body) },
    );
    mockDevice(
      '192.168.1.10',
      '/api/v1/state',
      'PUT',
      { power_on: true },
      { onBody: body => bodies.push(body) },
    );

    await runWithTimers(import('./switch-energy-socket'));

    expect(bodies).toStrictEqual([{ power_on: false }, { power_on: true }]);
    expect(printed()).toStrictEqual([
      'The socket is on',
      'Switched it off for 5 seconds',
      'Switched it back on',
    ]);
  });

  it("switch-energy-socket.ts doesn't switch a locked socket", async () => {
    mockDevice('192.168.1.10', '/api/v1/state', 'GET', {
      ...mockStateResponse,
      power_on: true,
      switch_lock: true,
    });

    await import('./switch-energy-socket');

    expect(printed()).toStrictEqual([
      'The socket is on',
      "The switch lock is on, so the socket can't be turned off",
    ]);
  });

  it('polling-energy-socket-data.ts prints what the socket uses each second, for 10 seconds', async () => {
    mockDevice('192.168.1.10', '/api/v1/data', 'GET', mockEnergySocketDataResponse, { times: 10 });

    await untilTimersStop(import('./polling-energy-socket-data'));

    expect(printed()).toStrictEqual(
      Array(10).fill(`${mockEnergySocketDataResponse.active_power_w} W`),
    );
  });

  it('polling-energy-socket-state.ts prints whether the socket is on each second, for 10 seconds', async () => {
    mockDevice(
      '192.168.1.10',
      '/api/v1/state',
      'GET',
      { ...mockStateResponse, power_on: true },
      { times: 10 },
    );

    await untilTimersStop(import('./polling-energy-socket-state'));

    expect(printed()).toStrictEqual(Array(10).fill('On'));
  });

  it('water-meter.ts prints the water usage', async () => {
    mockDevice('192.168.1.12', '/api/v1/data', 'GET', mockWaterMeterDataResponse);

    await import('./water-meter');

    const { total_liter_m3, active_liter_lpm } = mockWaterMeterDataResponse;
    expect(printed()).toStrictEqual([
      `${total_liter_m3} m3 in total, now ${active_liter_lpm} l/min`,
    ]);
  });

  it('p1-meter.ts prints what the home uses', async () => {
    mockDevice('192.168.1.35', '/api/v1/data', 'GET', mockP1MeterDataResponse);

    await import('./p1-meter');

    const data = mockP1MeterDataResponse;
    expect(printed()).toStrictEqual([
      `Using ${data.active_power_w} W, ${data.total_gas_m3} m3 of gas in total`,
    ]);
  });

  it('p1-meter-parsed-telegram.ts prints the parsed telegram', async () => {
    const raw = mockTelegramResponse['v50l3_2'];
    mockDevice('192.168.1.35', '/api/v1/telegram', 'GET', raw);

    await import('./p1-meter-parsed-telegram');

    const telegram = parseTelegram(raw);
    expect(printed()).toStrictEqual([
      `${telegram.meter.brand} ${telegram.meter.model}`,
      `Tariff 1: ${telegram.power.import.t1.value} ${telegram.power.import.t1.unit}`,
      `Gas: ${telegram.gas?.value} ${telegram.gas?.unit}`,
    ]);
  });

  it('polling-p1-meter-data.ts prints what the home uses each second, for 10 seconds', async () => {
    mockDevice('192.168.1.35', '/api/v1/data', 'GET', mockP1MeterDataResponse, { times: 10 });

    await untilTimersStop(import('./polling-p1-meter-data'));

    expect(printed()).toStrictEqual(Array(10).fill(`${mockP1MeterDataResponse.active_power_w} W`));
  });

  it('polling-p1-meter-telegram.ts prints the first line of the telegram each second, for 10 seconds', async () => {
    const raw = mockTelegramResponse['v50l3_2'];
    mockDevice('192.168.1.35', '/api/v1/telegram', 'GET', raw, { times: 10 });

    await untilTimersStop(import('./polling-p1-meter-telegram'));

    expect(printed()).toStrictEqual(Array(10).fill(raw.split('\n')[0]));
  });

  it('kwh-meter-1-phase.ts prints what the kWh meter measures', async () => {
    mockDevice('192.168.1.45', '/api/v1/data', 'GET', mockKwhMeter1PhaseResponse);

    await import('./kwh-meter-1-phase');

    const data = mockKwhMeter1PhaseResponse;
    expect(printed()).toStrictEqual([
      `Using ${data.active_power_w} W, ${data.total_power_import_t1_kwh} kWh in total`,
    ]);
  });

  it('kwh-meter-3-phase.ts prints what the kWh meter measures', async () => {
    mockDevice('192.168.1.46', '/api/v1/data', 'GET', mockKwhMeter3PhaseResponse);

    await import('./kwh-meter-3-phase');

    const data = mockKwhMeter3PhaseResponse;
    expect(printed()).toStrictEqual([
      `Using ${data.active_power_w} W (L1 ${data.active_power_l1_w} W), ${data.total_power_import_t1_kwh} kWh in total`,
    ]);
  });

  it('discovery.ts lists the devices it finds, and stops after 10 seconds', async () => {
    mocked.mdnsResponses = [mockMdnsResponse];

    await untilTimersStop(import('./discovery'));

    const { ip, txt } = mockDiscoveryResponse;
    expect(printed()).toStrictEqual([`${ip} ${txt.product_type} ${txt.product_name}`]);
  });
});
