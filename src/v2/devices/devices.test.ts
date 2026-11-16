import { mockV2, mockV2DeviceOptions, mockV2Host } from '@/mocks/api-v2';
import {
  mockV2Batteries,
  mockV2DeviceInformation,
  mockV2KwhMeter1PhaseMeasurement,
  mockV2KwhMeter3PhaseMeasurement,
  mockV2KwhMeterSystem,
  mockV2P1MeterMeasurement,
  mockV2P1MeterSystem,
  mockV2PlugInBatteryMeasurement,
  mockV2PlugInBatterySystem,
  mockV2Telegram,
  mockV2UserCreated,
  mockV2Users,
} from '@/mocks/data/v2';
import { HomeWizardApiV2Error } from '../errors';
import { KwhMeter1Phase, KwhMeter3Phase } from './kwh-meter';
import { P1Meter } from './p1-meter';
import { PlugInBattery } from './plug-in-battery';

interface MethodCase {
  method: string;
  path: string;
  httpMethod: string;
  args?: unknown[];
  response?: unknown;
  statusCode?: number;
  body?: unknown;
}

const commonCases = (measurement: unknown, system: unknown): MethodCase[] => [
  {
    method: 'getDevice',
    path: '/api',
    httpMethod: 'GET',
    response: mockV2DeviceInformation['HWE-P1'],
  },
  { method: 'getMeasurement', path: '/api/measurement', httpMethod: 'GET', response: measurement },
  { method: 'getSystem', path: '/api/system', httpMethod: 'GET', response: system },
  {
    method: 'updateSystem',
    path: '/api/system',
    httpMethod: 'PUT',
    args: [{ cloud_enabled: false }],
    response: system,
    body: { cloud_enabled: false },
  },
];

const rebootCase: MethodCase = {
  method: 'reboot',
  path: '/api/system/reboot',
  httpMethod: 'PUT',
  statusCode: 204,
};

const identifyCase: MethodCase = {
  method: 'identify',
  path: '/api/system/identify',
  httpMethod: 'PUT',
  statusCode: 204,
};

const batteriesCases: MethodCase[] = [
  { method: 'getBatteries', path: '/api/batteries', httpMethod: 'GET', response: mockV2Batteries },
  {
    method: 'updateBatteries',
    path: '/api/batteries',
    httpMethod: 'PUT',
    args: [{ mode: 'zero', permissions: ['discharge_allowed'] }],
    response: mockV2Batteries,
    body: { mode: 'zero', permissions: ['discharge_allowed'] },
  },
];

const devices = [
  {
    name: 'P1Meter',
    create: () => new P1Meter(mockV2Host, mockV2DeviceOptions),
    Class: P1Meter,
    cases: [
      ...commonCases(mockV2P1MeterMeasurement, mockV2P1MeterSystem),
      identifyCase,
      rebootCase,
      { method: 'getTelegram', path: '/api/telegram', httpMethod: 'GET', response: mockV2Telegram },
      ...batteriesCases,
    ],
    missing: [],
  },
  {
    name: 'KwhMeter1Phase',
    create: () => new KwhMeter1Phase(mockV2Host, mockV2DeviceOptions),
    Class: KwhMeter1Phase,
    cases: [
      ...commonCases(mockV2KwhMeter1PhaseMeasurement, mockV2KwhMeterSystem),
      rebootCase,
      ...batteriesCases,
    ],
    missing: ['identify', 'getTelegram'],
  },
  {
    name: 'KwhMeter3Phase',
    create: () => new KwhMeter3Phase(mockV2Host, mockV2DeviceOptions),
    Class: KwhMeter3Phase,
    cases: [
      ...commonCases(mockV2KwhMeter3PhaseMeasurement, mockV2KwhMeterSystem),
      rebootCase,
      ...batteriesCases,
    ],
    missing: ['identify', 'getTelegram'],
  },
  {
    name: 'PlugInBattery',
    create: () => new PlugInBattery(mockV2Host, mockV2DeviceOptions),
    Class: PlugInBattery,
    cases: [
      ...commonCases(mockV2PlugInBatteryMeasurement, mockV2PlugInBatterySystem),
      identifyCase,
    ],
    missing: ['reboot', 'getTelegram', 'getBatteries', 'updateBatteries'],
  },
];

describe.each(devices)('v2.$name', ({ create, Class, cases, missing }) => {
  describe.each(cases)(
    '$method()',
    ({ method, path, httpMethod, args = [], response, statusCode, body }) => {
      it(`should ${httpMethod} ${path}`, async () => {
        const onRequest = vi.fn();
        mockV2(path, httpMethod, { response, statusCode, onRequest });

        const device = create() as unknown as Record<
          string,
          (...args: unknown[]) => Promise<unknown>
        >;

        await expect(device[method](...args)).resolves.toStrictEqual(response);
        expect(onRequest.mock.calls[0][0].body).toStrictEqual(body);
      });

      it('should throw a HomeWizardApiV2Error for a 500', async () => {
        mockV2(path, httpMethod, {
          statusCode: 500,
          response: { error: 'request:internal-server-error' },
        });

        const device = create() as unknown as Record<
          string,
          (...args: unknown[]) => Promise<unknown>
        >;
        const error = (await device[method](...args).catch(error => error)) as HomeWizardApiV2Error;

        expect(error).toBeInstanceOf(HomeWizardApiV2Error);
        expect(error.statusCode).toBe(500);
      });
    },
  );

  it('should not have the methods the device does not support', () => {
    const device = create() as unknown as Record<string, unknown>;

    for (const method of missing) {
      expect(device[method]).toBeUndefined();
    }
  });

  it('should list and delete users', async () => {
    mockV2('/api/user', 'GET', { response: mockV2Users });
    const onDelete = vi.fn();
    mockV2('/api/user', 'DELETE', { statusCode: 204, onRequest: onDelete });

    const device = create();

    await expect(device.users.list()).resolves.toStrictEqual(mockV2Users);
    await expect(device.users.delete('cloud/cloud_user')).resolves.toBeUndefined();
    expect(onDelete.mock.calls[0][0].body).toStrictEqual({ name: 'cloud/cloud_user' });
  });

  it('should pair and return the device with the token and identifier', async () => {
    mockV2('/api/user', 'POST', { response: mockV2UserCreated });
    const onRequest = vi.fn();
    mockV2('/api', 'GET', { response: mockV2DeviceInformation['HWE-P1'], onRequest });

    const { device, token, identifier, name } = await (Class as typeof P1Meter).pair(
      mockV2Host,
      'new_user',
      {
        dispatcher: mockV2DeviceOptions.dispatcher,
        identifier: mockV2DeviceOptions.identifier,
      },
    );

    expect(device).toBeInstanceOf(Class);
    expect({ token, identifier, name }).toStrictEqual({
      token: mockV2UserCreated.token,
      identifier: mockV2DeviceOptions.identifier,
      name: mockV2UserCreated.name,
    });

    await device.getDevice();
    expect(onRequest.mock.calls[0][0].headers.authorization).toBe(
      `Bearer ${mockV2UserCreated.token}`,
    );
  });

  it('should close its connections', async () => {
    await expect(create().close()).resolves.toBeUndefined();
  });

  it('should pair without options', async () => {
    // http:// is refused before any request, so this doesn't reach the network
    await expect((Class as typeof P1Meter).pair('http://192.168.1.35', 'new_user')).rejects.toThrow(
      'The API v2 only works over HTTPS',
    );
  });
});
