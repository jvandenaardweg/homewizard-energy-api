import { PeerCertificate } from 'tls';
import { Agent } from 'undici';
import { mockV2, mockV2DeviceOptions, mockV2Host, mockV2Pool, mockV2Url } from '@/mocks/api-v2';
import { DEFAULT_TIMEOUT } from '@/shared/request';
import { Client, isNewerApiVersion, toBaseUrl } from './client';
import { HomeWizardError } from './errors';
import { HOMEWIZARD_CA_CERT } from './tls';

describe('v2/Client', () => {
  describe('toBaseUrl', () => {
    it('should refuse a missing host, as credentials from JSON can have', () => {
      expect(() => toBaseUrl(undefined as unknown as string)).toThrow(HomeWizardError);
      expect(() => toBaseUrl(' ')).toThrow('The "host" of the credentials is missing');
    });

    it('should turn a host into its HTTPS origin', () => {
      expect(toBaseUrl('192.168.1.35')).toBe('https://192.168.1.35');
      expect(toBaseUrl(' https://192.168.1.35/ ')).toBe('https://192.168.1.35');
      expect(toBaseUrl('HTTPS://p1meter.local')).toBe('HTTPS://p1meter.local');
    });

    it('should refuse http://', () => {
      expect(() => toBaseUrl('http://192.168.1.35')).toThrow(
        'The API v2 only works over HTTPS, use "https://192.168.1.35" or just the IP address',
      );
    });
  });

  describe('constructor', () => {
    it('should require an identifier', () => {
      expect(() => new Client(mockV2Host, { token: 'x' })).toThrow(HomeWizardError);
      expect(() => new Client(mockV2Host)).toThrow(/"identifier" of the credentials is required/);
    });

    it('should not require an identifier when insecure or pairing', () => {
      expect(() => new Client(mockV2Host, { insecure: true })).not.toThrow();
      expect(() => new Client(mockV2Host, { allowMissingIdentifier: true })).not.toThrow();
    });

    it('should create its own agent with the HomeWizard certificate checks', async () => {
      const client = new Client(mockV2Host, { identifier: 'appliance/p1dongle/aa' });

      expect(client.dispatcher).toBeInstanceOf(Agent);
      expect(client.baseUrl).toBe(mockV2Url);
      expect(client.tlsOptions.ca).toBe(HOMEWIZARD_CA_CERT);
      expect(client.tlsOptions.rejectUnauthorized).toBe(true);

      await client.close();
    });

    it('should use the given CA', () => {
      const client = new Client(mockV2Host, { ...mockV2DeviceOptions, ca: 'pem' });

      expect(client.tlsOptions.ca).toBe('pem');
    });

    it('should skip the certificate checks when insecure', () => {
      const client = new Client(mockV2Host, {
        insecure: true,
        dispatcher: mockV2DeviceOptions.dispatcher,
      });
      const { tlsOptions } = client;

      expect(tlsOptions.rejectUnauthorized).toBe(false);
      expect('ca' in tlsOptions).toBe(false);
      expect(tlsOptions.checkServerIdentity('x', {} as PeerCertificate)).toBeUndefined();
    });
  });

  describe('requests', () => {
    it('should send the API version, the token and JSON', async () => {
      const onRequest = vi.fn();
      mockV2('/api/system', 'PUT', { response: { cloud_enabled: false }, onRequest });

      const client = new Client(mockV2Host, mockV2DeviceOptions);
      const data = await client.json('PUT', '/api/system', { cloud_enabled: false });

      expect(data).toStrictEqual({ cloud_enabled: false });
      expect(onRequest).toHaveBeenCalledWith({
        headers: expect.objectContaining({
          'x-api-version': '2',
          authorization: `Bearer ${mockV2DeviceOptions.token}`,
          'content-type': 'application/json',
          accept: 'application/json',
        }),
        body: { cloud_enabled: false },
      });
    });

    it('should leave out the token and the content type when there are none', async () => {
      const onRequest = vi.fn();
      mockV2('/api', 'GET', { response: {}, onRequest });

      const client = new Client(mockV2Host, { ...mockV2DeviceOptions, token: undefined });
      await client.json('GET', '/api');

      const { headers } = onRequest.mock.calls[0][0];
      expect(headers.authorization).toBeUndefined();
      expect(headers['content-type']).toBeUndefined();
    });

    it('should read plain text', async () => {
      const onRequest = vi.fn();
      mockV2('/api/telegram', 'GET', { response: 'telegram', onRequest });

      const client = new Client(mockV2Host, mockV2DeviceOptions);

      await expect(client.text('GET', '/api/telegram')).resolves.toBe('telegram');
      expect(onRequest.mock.calls[0][0].headers.accept).toBe('text/plain');
    });

    it('should resolve an empty response', async () => {
      mockV2('/api/system/identify', 'PUT', { statusCode: 204 });

      const client = new Client(mockV2Host, mockV2DeviceOptions);

      await expect(client.empty('PUT', '/api/system/identify')).resolves.toBeUndefined();
    });

    it('should throw a HomeWizardError with the code for an error status', async () => {
      mockV2('/api', 'GET', { statusCode: 401, response: { error: 'user:unauthorized' } });

      const client = new Client(mockV2Host, mockV2DeviceOptions);
      const error = (await client.json('GET', '/api').catch(error => error)) as HomeWizardError;

      expect(error).toBeInstanceOf(HomeWizardError);
      expect(error.code).toBe('user:unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(
        `Api GET call at ${mockV2Url}/api failed with status 401 and response data: {"error":"user:unauthorized"}`,
      );
    });

    it('should throw a HomeWizardError for a 500 without a body', async () => {
      mockV2('/api', 'GET', { statusCode: 500 });

      const client = new Client(mockV2Host, mockV2DeviceOptions);
      const error = (await client.json('GET', '/api').catch(error => error)) as HomeWizardError;

      expect(error).toBeInstanceOf(HomeWizardError);
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBe(500);
    });

    it('should throw a response error for a body that is not valid JSON', async () => {
      mockV2('/api', 'GET', { response: 'not json' });

      const client = new Client(mockV2Host, mockV2DeviceOptions);
      const error = await client.json('GET', '/api').catch(error => error);

      expect(error).toBeInstanceOf(HomeWizardError);
      expect(error).toMatchObject({ kind: 'response', statusCode: 200, response: 'not json' });
    });

    it('should throw a network error when the connection fails', async () => {
      mockV2Pool.intercept({ path: '/api', method: 'GET' }).replyWithError(new Error('ECONNRESET'));

      const client = new Client(mockV2Host, mockV2DeviceOptions);
      const error = (await client.json('GET', '/api').catch(error => error)) as HomeWizardError;

      expect(error).toBeInstanceOf(HomeWizardError);
      expect(error.kind).toBe('network');
      expect(error.cause).toBeInstanceOf(Error);
    });

    it('should log requests and responses without the token', async () => {
      const method = vi.fn();
      mockV2('/api', 'GET', { response: { serial: 'aa' } });

      const client = new Client(mockV2Host, { ...mockV2DeviceOptions, logger: { method } });
      await client.json('GET', '/api');

      const logged = JSON.stringify(method.mock.calls);
      expect(logged).toContain(`GET ${mockV2Url}/api`);
      expect(logged).toContain('serial');
      expect(logged).not.toContain(mockV2DeviceOptions.token);
    });

    it('should time out', async () => {
      mockV2Pool
        .intercept({ path: '/api', method: 'GET' })
        .reply(200, '{}')
        .delay(DEFAULT_TIMEOUT + 1000);

      const client = new Client(mockV2Host, mockV2DeviceOptions);
      const request = client.json('GET', '/api').catch(error => error);

      await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT);

      await expect(request).resolves.toMatchObject({
        kind: 'timeout',
        url: `${mockV2Url}/api`,
        timeout: DEFAULT_TIMEOUT,
      });
      await expect(request).resolves.toBeInstanceOf(HomeWizardError);
    });

    it('should not time out with timeout 0', async () => {
      mockV2Pool
        .intercept({ path: '/api', method: 'GET' })
        .reply(200, '{}')
        .delay(DEFAULT_TIMEOUT + 1000);

      const client = new Client(mockV2Host, { ...mockV2DeviceOptions, timeout: 0 });
      const request = client.json('GET', '/api');

      await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT + 1000);

      await expect(request).resolves.toStrictEqual({});
    });
  });

  describe('API version', () => {
    it('should tell whether a version is newer', () => {
      expect(isNewerApiVersion('2.4.0', '2.3.0')).toBe(true);
      expect(isNewerApiVersion('2.3.1', '2.3.0')).toBe(true);
      expect(isNewerApiVersion('3', '2.3.0')).toBe(true);
      expect(isNewerApiVersion('2.10.0', '2.9.0')).toBe(true);
      expect(isNewerApiVersion('2.3.0.1', '2.3.0')).toBe(true);
      expect(isNewerApiVersion('2.3.0', '2.3.0')).toBe(false);
      expect(isNewerApiVersion('2.3', '2.3.0')).toBe(false);
      expect(isNewerApiVersion('2.2.0', '2.3.0')).toBe(false);
      expect(isNewerApiVersion('v2', '2.3.0')).toBe(false);
    });

    it('should log once when the device answers with a newer API version', async () => {
      const method = vi.fn();
      mockV2('/api', 'GET', { response: {}, headers: { 'x-api-version': '2.4.0' } });
      mockV2('/api', 'GET', { response: {}, headers: { 'x-api-version': '2.4.0' } });

      const client = new Client(mockV2Host, { ...mockV2DeviceOptions, logger: { method } });
      await client.json('GET', '/api');
      await client.json('GET', '/api');

      const warnings = method.mock.calls.filter(call => String(call[1]).includes('newer than'));
      expect(warnings).toHaveLength(1);
      expect(warnings[0][1]).toBe(
        "The device answers with API 2.4.0, newer than the 2.3.0 this library follows. It keeps working, but fields added since aren't in the types yet.",
      );
    });

    it('should not log for a documented API version or without the header', async () => {
      const method = vi.fn();
      mockV2('/api', 'GET', { response: {}, headers: { 'x-api-version': '2.2.0' } });
      mockV2('/api', 'GET', { response: {} });

      const client = new Client(mockV2Host, { ...mockV2DeviceOptions, logger: { method } });
      await client.json('GET', '/api');
      await client.json('GET', '/api');

      expect(JSON.stringify(method.mock.calls)).not.toContain('newer than');
    });
  });

  describe('close', () => {
    it('should close its own agent, but not a given dispatcher', async () => {
      const own = new Client(mockV2Host, { identifier: 'appliance/p1dongle/aa' });
      const closeOwn = vi.spyOn(own.dispatcher, 'close');
      await own.close();
      expect(closeOwn).toHaveBeenCalled();

      const given = new Client(mockV2Host, mockV2DeviceOptions);
      const closeGiven = vi.spyOn(given.dispatcher, 'close');
      await given.close();
      expect(closeGiven).not.toHaveBeenCalled();
    });
  });
});
