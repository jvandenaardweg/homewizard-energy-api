import { mockV2, mockV2DeviceOptions, mockV2Host } from '@/mocks/api-v2';
import {
  mockV2Batteries,
  mockV2BatteriesByApiVersion,
  mockV2DeviceInformation,
  mockV2P1MeterMeasurement,
  mockV2P1MeterMeasurement1PhaseNoGas,
  mockV2P1MeterSystem,
  mockV2Telegram,
  mockV2UserCreated,
  mockV2Users,
} from '@/mocks/data/v2';
import { parseTelegram } from '@/telegram';
import { Client } from './client';
import * as endpoints from './endpoints';
import { HomeWizardError } from './errors';

const client = () => new Client(mockV2Host, mockV2DeviceOptions);

describe('v2/endpoints', () => {
  const cases: {
    name: string;
    path: string;
    method: string;
    call: (client: Client) => Promise<unknown>;
    response?: unknown;
    statusCode?: number;
    body?: unknown;
  }[] = [
    {
      name: 'getDevice',
      path: '/api',
      method: 'GET',
      call: endpoints.getDevice,
      response: mockV2DeviceInformation['HWE-P1'],
    },
    {
      name: 'getMeasurement',
      path: '/api/measurement',
      method: 'GET',
      call: endpoints.getMeasurement,
      response: mockV2P1MeterMeasurement,
    },
    {
      name: 'getSystem',
      path: '/api/system',
      method: 'GET',
      call: endpoints.getSystem,
      response: mockV2P1MeterSystem,
    },
    {
      name: 'updateSystem',
      path: '/api/system',
      method: 'PUT',
      call: c => endpoints.updateSystem(c, { status_led_brightness_pct: 50 }),
      response: mockV2P1MeterSystem,
      body: { status_led_brightness_pct: 50 },
    },
    {
      name: 'identify',
      path: '/api/system/identify',
      method: 'PUT',
      call: endpoints.identify,
      statusCode: 204,
    },
    {
      name: 'reboot',
      path: '/api/system/reboot',
      method: 'PUT',
      call: endpoints.reboot,
      statusCode: 204,
    },
    {
      name: 'getTelegram',
      path: '/api/telegram',
      method: 'GET',
      call: endpoints.getTelegram,
      response: mockV2Telegram,
    },
    {
      name: 'getBatteries',
      path: '/api/batteries',
      method: 'GET',
      call: endpoints.getBatteries,
      response: mockV2Batteries,
    },
    {
      name: 'updateBatteries',
      path: '/api/batteries',
      method: 'PUT',
      call: c => endpoints.updateBatteries(c, { permissions: ['charge_allowed'] }),
      response: mockV2Batteries,
      body: { permissions: ['charge_allowed'] },
    },
    {
      name: 'createUser',
      path: '/api/user',
      method: 'POST',
      call: c => endpoints.createUser(c, 'new_user'),
      response: mockV2UserCreated,
      body: { name: 'local/new_user' },
    },
    {
      name: 'listUsers',
      path: '/api/user',
      method: 'GET',
      call: endpoints.listUsers,
      response: mockV2Users,
    },
    {
      name: 'deleteUser',
      path: '/api/user',
      method: 'DELETE',
      call: c => endpoints.deleteUser(c, 'cloud/cloud_user'),
      statusCode: 204,
      body: { name: 'cloud/cloud_user' },
    },
  ];

  describe.each(cases)('$name', ({ path, method, call, response, statusCode, body }) => {
    it(`should ${method} ${path}`, async () => {
      const onRequest = vi.fn();
      mockV2(path, method, { response, statusCode, onRequest });

      await expect(call(client())).resolves.toStrictEqual(response);
      expect(onRequest.mock.calls[0][0].body).toStrictEqual(body);
    });

    it('should throw a HomeWizardError for a 500', async () => {
      mockV2(path, method, {
        statusCode: 500,
        response: { error: 'request:internal-server-error' },
      });

      const error = (await call(client()).catch(error => error)) as HomeWizardError;

      expect(error).toBeInstanceOf(HomeWizardError);
      expect(error.code).toBe('request:internal-server-error');
    });
  });

  it.each(Object.entries(mockV2BatteriesByApiVersion))(
    'should return the batteries of a device with API %s',
    async (_version, batteries) => {
      mockV2('/api/batteries', 'GET', { response: batteries });

      await expect(endpoints.getBatteries(client())).resolves.toStrictEqual(batteries);
    },
  );

  it('should return a P1 measurement without the data points the meter leaves out', async () => {
    mockV2('/api/measurement', 'GET', { response: mockV2P1MeterMeasurement1PhaseNoGas });

    const measurement = await endpoints.getMeasurement(client());

    expect(measurement).toStrictEqual(mockV2P1MeterMeasurement1PhaseNoGas);
    expect(measurement).not.toHaveProperty('external');
  });

  it('should return a full telegram that parseTelegram() reads', async () => {
    mockV2('/api/telegram', 'GET', { response: mockV2Telegram });

    const telegram = parseTelegram(await endpoints.getTelegram(client()));

    expect(telegram.power.import.t1).toStrictEqual({ value: 10830.511, unit: 'kWh' });
    expect(telegram.power.export.t2).toStrictEqual({ value: 2876.514, unit: 'kWh' });
  });

  it('should throw the plain-text code when there is no telegram', async () => {
    mockV2('/api/telegram', 'GET', { statusCode: 503, response: 'telegram:no-telegram-received' });

    const error = await endpoints.getTelegram(client()).catch(error => error);

    expect(error.code).toBe('telegram:no-telegram-received');
    expect(error.statusCode).toBe(503);
  });

  it('should throw the invalid parameter from updateSystem', async () => {
    mockV2('/api/system', 'PUT', {
      statusCode: 400,
      response: { error: 'json:parameter-invalid-type:status_led_brightness_pct' },
    });

    const error = await endpoints
      .updateSystem(client(), { status_led_brightness_pct: 123 })
      .catch(error => error);

    expect(error.code).toBe('json:parameter-invalid-type:status_led_brightness_pct');
  });

  describe('toLocalUserName', () => {
    it('should add the local/ prefix once', () => {
      expect(endpoints.toLocalUserName('my-app')).toBe('local/my-app');
      expect(endpoints.toLocalUserName('local/my-app')).toBe('local/my-app');
      expect(endpoints.toLocalUserName('40character-name/with#special\\characters')).toBe(
        'local/40character-name/with#special\\characters',
      );
    });

    it('should refuse names the device refuses', () => {
      expect(() => endpoints.toLocalUserName('')).toThrow(HomeWizardError);
      expect(() => endpoints.toLocalUserName('local/')).toThrow(/is invalid/);
      expect(() => endpoints.toLocalUserName('a'.repeat(41))).toThrow(/is invalid/);
      expect(() => endpoints.toLocalUserName('my.app')).toThrow(/is invalid/);
    });

    it('should not send a request for an invalid name', async () => {
      await expect(endpoints.createUser(client(), 'my.app')).rejects.toThrow(/is invalid/);
    });
  });
});
