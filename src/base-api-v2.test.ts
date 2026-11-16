import { mockApiUrl } from '@/mocks/api';
import { apiV2Mocks, mockedRequestsV2, mockTokenV2, mockUserNameV2 } from '@/mocks/api-v2';
import {
  mockBasicInformationV2Response,
  mockBatteriesResponse,
  mockP1MeterMeasurementResponse,
  mockSystemV2Response,
  mockUserListResponse,
} from '@/mocks/data/v2';
import {
  BaseApiV2,
  createCheckServerIdentity,
  DEFAULT_V2_BODY_TIMEOUT,
  DEFAULT_V2_HEADERS_TIMEOUT,
  HomeWizardEnergyApiV2PairError,
  HomeWizardEnergyApiV2ResponseError,
} from '@/base-api-v2';
import { HomeWizardEnergyApiResponseError } from '@/base-api';
import { HOMEWIZARD_CA_CERT } from '@/homewizard-ca-cert';
import { ErrorCodesV2, getCertificateIdentifier } from '@/types-v2';
import { Agent } from 'undici';
import { X509Certificate } from 'crypto';

let baseApi: BaseApiV2;

const lastRequest = () => mockedRequestsV2[mockedRequestsV2.length - 1];

describe('BaseApiV2', () => {
  beforeEach(() => {
    mockedRequestsV2.length = 0;
    baseApi = new BaseApiV2(mockApiUrl, { api: { token: mockTokenV2 } });
  });

  describe('instance', () => {
    it('should be able to create a new instance', () => {
      expect(baseApi).toBeTruthy();
      expect(baseApi['apiVersion']).toBe('v2');
      expect(baseApi.isAuthorized).toBe(true);
    });

    it('should have the default requestOptions set', () => {
      expect(baseApi['requestOptions']?.bodyTimeout).toBe(DEFAULT_V2_BODY_TIMEOUT);
      expect(baseApi['requestOptions']?.headersTimeout).toBe(DEFAULT_V2_HEADERS_TIMEOUT);
    });

    it('should allow to overwrite the requestOptions', () => {
      const api = new BaseApiV2(mockApiUrl, { requestOptions: { bodyTimeout: 10 } });

      expect(api['requestOptions']?.bodyTimeout).toBe(10);
      expect(api['requestOptions']?.headersTimeout).toBe(DEFAULT_V2_HEADERS_TIMEOUT);
    });

    it('should have the endpoints of the API v2 set', () => {
      expect(baseApi['endpoints'].basic).toBe(`${mockApiUrl}/api`);
      expect(baseApi['endpoints'].data).toBe(`${mockApiUrl}/api/measurement`);
      expect(baseApi['endpoints'].user).toBe(`${mockApiUrl}/api/user`);
      expect(baseApi['endpoints'].system).toBe(`${mockApiUrl}/api/system`);
      expect(baseApi['endpoints'].identify).toBe(`${mockApiUrl}/api/system/identify`);
      expect(baseApi['endpoints'].reboot).toBe(`${mockApiUrl}/api/system/reboot`);
      expect(baseApi['endpoints'].batteries).toBe(`${mockApiUrl}/api/batteries`);
      expect(baseApi['endpoints'].telegram).toBe(`${mockApiUrl}/api/telegram`);
    });

    it('should not create a dispatcher when using http', () => {
      expect(baseApi['dispatcher']).toBeUndefined();
    });

    it('should create a dispatcher when using https, and close it', async () => {
      const api = new BaseApiV2('https://192.168.1.10', {
        api: { identifier: 'appliance/p1dongle/5c2fafaabbcc' },
      });

      expect(api['dispatcher']).toBeInstanceOf(Agent);

      await expect(api.close()).resolves.toBeUndefined();
    });

    it('should not create a dispatcher when the user provides one', async () => {
      const dispatcher = new Agent();
      const api = new BaseApiV2('https://192.168.1.10', { requestOptions: { dispatcher } });

      expect(api['dispatcher']).toBeUndefined();

      await api.close();
      await dispatcher.close();
    });

    it('should set and remove the token using setToken()', () => {
      const api = new BaseApiV2(mockApiUrl);

      expect(api.isAuthorized).toBe(false);
      api.setToken(mockTokenV2);
      expect(api.isAuthorized).toBe(true);
      api.setToken(undefined);
      expect(api.isAuthorized).toBe(false);
    });
  });

  describe('HOMEWIZARD_CA_CERT', () => {
    it('should be the valid HomeWizard CA certificate', () => {
      const certificate = new X509Certificate(HOMEWIZARD_CA_CERT);

      expect(certificate.subject).toContain('O=HomeWizard');
      expect(certificate.subject).toContain('CN=Appliance Access CA');
      expect(certificate.fingerprint256).toBe(
        '4E:C2:77:E6:20:33:FA:E8:BC:37:3E:3F:2A:97:66:76:D3:F6:65:68:38:73:F1:EA:8E:3B:DF:78:AC:68:00:03',
      );
    });
  });

  describe('createCheckServerIdentity()', () => {
    const identifier = 'appliance/p1dongle/5c2fafaabbcc';

    it('should accept any certificate when there is no identifier', () => {
      expect(createCheckServerIdentity()('192.168.1.10', { subject: { CN: 'x' } })).toBeUndefined();
    });

    it('should accept the certificate when the common name is the identifier', () => {
      const check = createCheckServerIdentity(identifier);

      expect(check('192.168.1.10', { subject: { CN: identifier } })).toBeUndefined();
      expect(check('192.168.1.10', { subject: { CN: ['other', identifier] } })).toBeUndefined();
    });

    it('should return an error when the common name is not the identifier', () => {
      const check = createCheckServerIdentity(identifier);

      expect(check('192.168.1.10', { subject: { CN: 'appliance/p1dongle/000000000000' } })).toEqual(
        new Error(
          'The certificate of the device is issued to "appliance/p1dongle/000000000000", but expected "appliance/p1dongle/5c2fafaabbcc"',
        ),
      );
      expect(check('192.168.1.10', {})).toBeInstanceOf(Error);
    });
  });

  describe('getCertificateIdentifier()', () => {
    it('should return the identifier by product type', () => {
      expect(getCertificateIdentifier('HWE-P1', '5c2fafaabbcc')).toBe(
        'appliance/p1dongle/5c2fafaabbcc',
      );
      expect(getCertificateIdentifier('HWE-KWH3', '5c2fafaabbcc')).toBe(
        'appliance/energymeter/5c2fafaabbcc',
      );
      expect(getCertificateIdentifier('HWE-BAT', '5c2fafaabbcc')).toBe(
        'appliance/battery/5c2fafaabbcc',
      );
    });

    it('should return undefined when the product type is unknown', () => {
      expect(getCertificateIdentifier('HWE-NEW', '5c2fafaabbcc')).toBeUndefined();
    });
  });

  describe('request()', () => {
    it('should send the api version and authorization headers', async () => {
      apiV2Mocks.getBasicInformation({ response: mockBasicInformationV2Response });

      const basicInformation = await baseApi['getBasicInformation']();

      expect(basicInformation).toStrictEqual(mockBasicInformationV2Response);
      expect(lastRequest().headers['X-Api-Version']).toBe('2');
      expect(lastRequest().headers['Authorization']).toBe(`Bearer ${mockTokenV2}`);
      expect(lastRequest().headers['Content-Type']).toBeUndefined();
    });

    it('should not send the authorization header without a token', async () => {
      const api = new BaseApiV2(mockApiUrl);

      apiV2Mocks.getBasicInformation({
        response: { error: 'user:unauthorized' },
        statusCode: 401,
      });

      await expect(api['getBasicInformation']()).rejects.toThrowError(
        'Api GET call at http://localhost/api failed with status 401 and response data: {"error":"user:unauthorized"}',
      );
      expect(lastRequest().headers['Authorization']).toBeUndefined();
    });
  });

  describe('throwResponseError()', () => {
    it('should throw an error with the error code of the API v2', async () => {
      apiV2Mocks.getData({ response: { error: 'user:unauthorized' }, statusCode: 401 });

      const error = await baseApi['getData']().catch(e => e);

      expect(error).toBeInstanceOf(HomeWizardEnergyApiV2ResponseError);
      expect(error).toBeInstanceOf(HomeWizardEnergyApiResponseError);
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe(ErrorCodesV2.USER_UNAUTHORIZED);
    });

    it('should get the error code from a plain text response', async () => {
      apiV2Mocks.getTelegram({ response: 'telegram:no-telegram-received', statusCode: 503 });

      const error = await baseApi['getTelegram']().catch(e => e);

      expect(error.errorCode).toBe(ErrorCodesV2.TELEGRAM_NO_TELEGRAM_RECEIVED);
    });

    it('should have no error code when the response is not an API v2 error', async () => {
      apiV2Mocks.getData({ response: 'Server error!', statusCode: 500 });

      const error = await baseApi['getData']().catch(e => e);

      expect(error).toBeInstanceOf(HomeWizardEnergyApiV2ResponseError);
      expect(error.errorCode).toBeUndefined();
      expect(error.response).toBe('Server error!');
    });
  });

  describe('createUser()', () => {
    it('should POST the "user" endpoint, prefix the name and set the token', async () => {
      const api = new BaseApiV2(mockApiUrl);

      apiV2Mocks.createUser({ response: { token: mockTokenV2, name: mockUserNameV2 } });

      const user = await api.createUser('my-app');

      expect(user).toStrictEqual({ token: mockTokenV2, name: mockUserNameV2 });
      expect(api.isAuthorized).toBe(true);
      expect(lastRequest().body).toStrictEqual({ name: mockUserNameV2 });
      expect(lastRequest().headers['Content-Type']).toBe('application/json');
      expect(lastRequest().headers['Authorization']).toBeUndefined();
    });

    it('should not prefix the name twice', async () => {
      apiV2Mocks.createUser({ response: { token: mockTokenV2, name: mockUserNameV2 } });

      await baseApi.createUser(mockUserNameV2);

      expect(lastRequest().body).toStrictEqual({ name: mockUserNameV2 });
    });

    it('should throw "user:creation-not-enabled" when the button is not pressed', async () => {
      const api = new BaseApiV2(mockApiUrl);

      apiV2Mocks.createUser({
        response: { error: 'user:creation-not-enabled' },
        statusCode: 403,
      });

      const error = await api.createUser('my-app').catch(e => e);

      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe(ErrorCodesV2.USER_CREATION_NOT_ENABLED);
      expect(api.isAuthorized).toBe(false);
    });
  });

  describe('pair()', () => {
    // pair() waits between each try, we use real (short) timers here
    beforeEach(() => {
      vi.useRealTimers();
    });

    afterEach(() => {
      vi.useFakeTimers();
    });

    it('should keep trying until the button is pressed', async () => {
      const api = new BaseApiV2(mockApiUrl);
      const onTry = vi.fn();

      apiV2Mocks.createUser({ response: { error: 'user:creation-not-enabled' }, statusCode: 403 });
      apiV2Mocks.createUser({ response: { error: 'user:creation-not-enabled' }, statusCode: 403 });
      apiV2Mocks.createUser({ response: { token: mockTokenV2, name: mockUserNameV2 } });

      const user = await api.pair('my-app', { interval: 1, timeout: 5000, onTry });

      expect(user.token).toBe(mockTokenV2);
      expect(api.isAuthorized).toBe(true);
      expect(onTry).toHaveBeenCalledTimes(3);
      expect(mockedRequestsV2).toHaveLength(3);
    });

    it('should throw a timeout error when the button is not pressed in time', async () => {
      const api = new BaseApiV2(mockApiUrl);

      apiV2Mocks.createUser({ response: { error: 'user:creation-not-enabled' }, statusCode: 403 });

      const error = await api.pair('my-app', { interval: 30, timeout: 20 }).catch(e => e);

      expect(error).toBeInstanceOf(HomeWizardEnergyApiV2PairError);
      expect(error.reason).toBe('timeout');
      expect(api.isAuthorized).toBe(false);
    });

    it('should stop when the signal is aborted', async () => {
      const api = new BaseApiV2(mockApiUrl);
      const controller = new AbortController();

      apiV2Mocks.createUser({
        response: { error: 'user:creation-not-enabled' },
        statusCode: 403,
      });

      const startedAt = Date.now();
      // a long interval: the abort must not wait for the next try
      const promise = api
        .pair('my-app', { interval: 5000, signal: controller.signal })
        .catch(e => e);

      setTimeout(() => controller.abort(), 30);

      const error = await promise;

      expect(Date.now() - startedAt).toBeLessThan(1000);

      expect(error).toBeInstanceOf(HomeWizardEnergyApiV2PairError);
      expect(error.reason).toBe('aborted');
    });

    it('should not keep trying on other errors of the API', async () => {
      const api = new BaseApiV2(mockApiUrl);

      apiV2Mocks.createUser({ response: { error: 'user:no-storage' }, statusCode: 400 });

      const error = await api.pair('my-app', { interval: 1 }).catch(e => e);

      expect(error).toBeInstanceOf(HomeWizardEnergyApiV2ResponseError);
      expect(error.errorCode).toBe(ErrorCodesV2.USER_NO_STORAGE);
      expect(mockedRequestsV2).toHaveLength(1);
    });
  });

  describe('getUsers()', () => {
    it('should GET the "user" endpoint', async () => {
      apiV2Mocks.getUsers({ response: mockUserListResponse });

      expect(await baseApi.getUsers()).toStrictEqual(mockUserListResponse);
    });

    it('should throw an error when the "user" endpoint returns an error', async () => {
      apiV2Mocks.getUsers({ response: { error: 'user:unauthorized' }, statusCode: 401 });

      await expect(baseApi.getUsers()).rejects.toThrowError('failed with status 401');
    });
  });

  describe('deleteUser()', () => {
    it('should DELETE the given user and keep the token', async () => {
      apiV2Mocks.deleteUser();

      await baseApi.deleteUser('cloud/cloud_user');

      expect(lastRequest().body).toStrictEqual({ name: 'cloud/cloud_user' });
      expect(baseApi.isAuthorized).toBe(true);
    });

    it('should DELETE the current user and remove the token', async () => {
      apiV2Mocks.deleteUser();

      await baseApi.deleteUser();

      expect(baseApi.isAuthorized).toBe(false);
    });

    it('should throw an error when the user is not found', async () => {
      apiV2Mocks.deleteUser({ response: { error: 'user:not-found' }, statusCode: 404 });

      const error = await baseApi.deleteUser('local/unknown').catch(e => e);

      expect(error.errorCode).toBe(ErrorCodesV2.USER_NOT_FOUND);
    });
  });

  describe('getData()', () => {
    it('should GET the "measurement" endpoint', async () => {
      apiV2Mocks.getData({ response: mockP1MeterMeasurementResponse });

      expect(await baseApi['getData']()).toStrictEqual(mockP1MeterMeasurementResponse);
    });
  });

  describe('polling.getData', () => {
    it('should start polling getData when start() is invoked', async () =>
      new Promise(done => {
        apiV2Mocks.getData({ response: mockP1MeterMeasurementResponse });

        baseApi.polling.getData.start();

        baseApi.polling.getData.on('response', response => {
          expect(response).toStrictEqual(mockP1MeterMeasurementResponse);
          baseApi.polling.getData.stop();
          done(response);
        });
      }));
  });

  describe('getSystem() / updateSystem()', () => {
    it('should GET the "system" endpoint', async () => {
      apiV2Mocks.getSystem({ response: mockSystemV2Response });

      expect(await baseApi['getSystem']()).toStrictEqual(mockSystemV2Response);
    });

    it('should PUT the "system" endpoint', async () => {
      apiV2Mocks.updateSystem({
        response: { ...mockSystemV2Response, status_led_brightness_pct: 50 },
      });

      const system = await baseApi['updateSystem']({ status_led_brightness_pct: 50 });

      expect(system.status_led_brightness_pct).toBe(50);
      expect(lastRequest().body).toStrictEqual({ status_led_brightness_pct: 50 });
    });

    it('should throw an error on GET and PUT when the "system" endpoint returns an error', async () => {
      apiV2Mocks.getSystem({ response: 'Server error!', statusCode: 500 });
      apiV2Mocks.updateSystem({
        response: { error: 'json:parameter-invalid-type:status_led_brightness_pct' },
        statusCode: 400,
      });

      await expect(baseApi['getSystem']()).rejects.toThrowError('failed with status 500');

      const error = await baseApi['updateSystem']({ status_led_brightness_pct: 200 }).catch(e => e);

      expect(error.errorCode).toBe('json:parameter-invalid-type:status_led_brightness_pct');
    });
  });

  describe('identify() / reboot()', () => {
    it('should PUT the "identify" endpoint', async () => {
      apiV2Mocks.identify();

      await expect(baseApi['identify']()).resolves.toBeUndefined();
      expect(lastRequest().path).toBe('/api/system/identify');
    });

    it('should PUT the "reboot" endpoint', async () => {
      apiV2Mocks.reboot();

      await expect(baseApi['reboot']()).resolves.toBeUndefined();
      expect(lastRequest().path).toBe('/api/system/reboot');
    });

    it('should throw an error when the action returns an error', async () => {
      apiV2Mocks.identify({ response: { error: 'user:unauthorized' }, statusCode: 401 });

      await expect(baseApi['identify']()).rejects.toThrowError('failed with status 401');
    });
  });

  describe('getBatteries() / updateBatteries()', () => {
    it('should GET the "batteries" endpoint', async () => {
      apiV2Mocks.getBatteries({ response: mockBatteriesResponse });

      expect(await baseApi['getBatteries']()).toStrictEqual(mockBatteriesResponse);
    });

    it('should PUT the "batteries" endpoint', async () => {
      apiV2Mocks.updateBatteries({
        response: { ...mockBatteriesResponse, permissions: ['charge_allowed'] },
      });

      const batteries = await baseApi['updateBatteries']({ permissions: ['charge_allowed'] });

      expect(batteries.permissions).toStrictEqual(['charge_allowed']);
      expect(lastRequest().body).toStrictEqual({ permissions: ['charge_allowed'] });
    });

    it('should throw an error on GET and PUT when the "batteries" endpoint returns an error', async () => {
      apiV2Mocks.getBatteries({ response: 'Not found', statusCode: 404 });
      apiV2Mocks.updateBatteries({
        response: { error: 'json:parameter-not-exclusive' },
        statusCode: 400,
      });

      await expect(baseApi['getBatteries']()).rejects.toThrowError('failed with status 404');
      await expect(
        baseApi['updateBatteries']({ mode: 'to_full', permissions: [] }),
      ).rejects.toThrowError('failed with status 400');
    });
  });

  describe('getTelegram()', () => {
    it('should GET the "telegram" endpoint as plain text', async () => {
      apiV2Mocks.getTelegram({ response: '/ISK5\\2M550T-1012' });

      expect(await baseApi['getTelegram']()).toBe('/ISK5\\2M550T-1012');
      expect(lastRequest().headers['Accept']).toBe('text/plain');
    });
  });
});
