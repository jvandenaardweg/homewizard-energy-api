import { ServerResponse } from 'http';
import { mockApiAgent } from '@/mocks/agent';
import { mockV2, mockV2Host, mockV2NetworkError, mockV2Pool } from '@/mocks/api-v2';
import { mockV2DeviceInformation, mockV2Identifier, mockV2UserCreated } from '@/mocks/data/v2';
import {
  mockTlsCa,
  mockTlsIdentifier,
  mockTlsOtherIdentifier,
  MockTlsServer,
  startMockTlsServer,
} from '@/mocks/tls/server';
import { HomeWizardError } from './errors';
import { pair } from './pairing';
import { CERTIFICATE_IDENTITY_ERROR_CODE } from './tls';

const identifier = mockV2Identifier;
const options = { dispatcher: mockApiAgent, identifier };

const mockButtonNotPressed = (times = 1) =>
  mockV2Pool
    .intercept({ path: '/api/user', method: 'POST' })
    .reply(403, { error: 'user:creation-not-enabled' })
    .times(times);

describe('v2/pair', () => {
  it('should keep trying until the button is pressed', async () => {
    const onAttempt = vi.fn();
    mockButtonNotPressed(2);
    mockV2('/api/user', 'POST', { response: mockV2UserCreated });

    const pairing = pair(mockV2Host, 'new_user', { ...options, onAttempt });
    await vi.advanceTimersByTimeAsync(4000);

    await expect(pairing).resolves.toStrictEqual({
      host: mockV2Host,
      token: mockV2UserCreated.token,
      identifier,
    });
    expect(onAttempt).toHaveBeenCalledTimes(3);
    expect(onAttempt).toHaveBeenNthCalledWith(1, 120000);
    expect(onAttempt).toHaveBeenNthCalledWith(3, 116000);
  });

  it('should give up after the pair timeout', async () => {
    mockButtonNotPressed(3);

    const pairing = pair(mockV2Host, 'new_user', { ...options, pairTimeout: 5000 }).catch(
      error => error,
    );
    // Attempts at 0, 2000 and 4000ms, then only 1000ms of waiting is left
    await vi.advanceTimersByTimeAsync(5000);

    const error = await pairing;
    expect(error).toBeInstanceOf(HomeWizardError);
    expect(error.reason).toBe('timeout');
    expect(error.message).toBe('The button on the device was not pressed within 5000ms');
  });

  it('should stop when aborted while waiting', async () => {
    const controller = new AbortController();
    mockButtonNotPressed();

    const pairing = pair(mockV2Host, 'new_user', { ...options, signal: controller.signal }).catch(
      error => error,
    );
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();

    const error = await pairing;
    expect(error).toBeInstanceOf(HomeWizardError);
    expect(error.reason).toBe('aborted');
  });

  it('should not start when already aborted', async () => {
    const error = await pair(mockV2Host, 'new_user', {
      ...options,
      signal: AbortSignal.abort(),
    }).catch(error => error);

    expect(error.reason).toBe('aborted');
  });

  it('should throw an error from the device straight away', async () => {
    mockV2('/api/user', 'POST', { statusCode: 400, response: { error: 'user:no-storage' } });

    const error = await pair(mockV2Host, 'new_user', options).catch(error => error);

    expect(error).toBeInstanceOf(HomeWizardError);
    expect(error.code).toBe('user:no-storage');
  });

  it('should throw an invalid name without sending a request', async () => {
    await expect(pair(mockV2Host, 'my.app', options)).rejects.toThrow(/is invalid/);
  });

  it('should throw a name that is not a string straight away, without retrying', async () => {
    const error = await pair(mockV2Host, undefined as never, options).catch(error => error);

    expect(error).toMatchObject({ kind: 'invalid' });
  });

  it('should retry after a network error', async () => {
    mockV2NetworkError('/api/user', 'POST', 'socket hang up');
    mockV2('/api/user', 'POST', { response: mockV2UserCreated });

    const method = vi.fn();
    const pairing = pair(mockV2Host, 'new_user', { ...options, logger: { method } });
    await vi.advanceTimersByTimeAsync(2000);

    await expect(pairing).resolves.toMatchObject({ token: mockV2UserCreated.token });
    expect(JSON.stringify(method.mock.calls)).toContain('Pairing attempt failed, trying again');
  });

  it('should refuse a custom dispatcher without an identifier before creating a token', async () => {
    const onRequest = vi.fn();
    mockV2('/api/user', 'POST', { response: mockV2UserCreated, onRequest });

    await expect(pair(mockV2Host, 'new_user', { dispatcher: mockApiAgent })).rejects.toThrow(
      /can't read the identifier from the certificate/,
    );
    expect(onRequest).not.toHaveBeenCalled();

    // Use up the interceptor, so it doesn't answer a later test
    await pair(mockV2Host, 'new_user', options);
  });

  it('should retry the device information after an insecure pairing, so the token is kept', async () => {
    mockV2('/api/user', 'POST', { response: mockV2UserCreated });
    mockV2NetworkError('/api');
    mockV2('/api', 'GET', { response: mockV2DeviceInformation['HWE-P1'] });

    const pairing = pair(mockV2Host, 'new_user', { dispatcher: mockApiAgent, insecure: true });
    await vi.advanceTimersByTimeAsync(500);

    await expect(pairing).resolves.toMatchObject({
      token: mockV2UserCreated.token,
      identifier: 'appliance/p1dongle/5c2fafaabbcc',
    });
  });

  it('should build the identifier from the device information when insecure', async () => {
    mockV2('/api/user', 'POST', { response: mockV2UserCreated });
    const onRequest = vi.fn();
    mockV2('/api', 'GET', { response: mockV2DeviceInformation['HWE-KWH3'], onRequest });

    const result = await pair(mockV2Host, 'new_user', {
      dispatcher: mockApiAgent,
      insecure: true,
    });

    expect(result.identifier).toBe('appliance/energymeter/5c2fafaabbcc');
    expect(onRequest.mock.calls[0][0].headers.authorization).toBe(
      `Bearer ${mockV2UserCreated.token}`,
    );
  });

  it('should keep the token with an empty identifier when insecure and the product type is unknown', async () => {
    mockV2('/api/user', 'POST', { response: mockV2UserCreated });
    mockV2('/api', 'GET', {
      response: { ...mockV2DeviceInformation['HWE-P1'], product_type: 'HWE-NEW' },
    });

    await expect(
      pair(mockV2Host, 'new_user', { dispatcher: mockApiAgent, insecure: true }),
    ).resolves.toStrictEqual({ host: mockV2Host, token: mockV2UserCreated.token, identifier: '' });
  });

  it('should never log the token', async () => {
    const method = vi.fn();
    mockV2('/api/user', 'POST', { response: mockV2UserCreated });

    await pair(mockV2Host, 'new_user', { ...options, logger: { method } });

    const logged = JSON.stringify(method.mock.calls);
    expect(logged).toContain('Paired as local/new_user');
    expect(logged).toContain('[redacted]');
    expect(logged).not.toContain(mockV2UserCreated.token);
  });

  describe('with a TLS connection', () => {
    let server: MockTlsServer;
    let attempts = 0;
    let onButtonNotPressed: (response: ServerResponse) => void;

    beforeEach(async () => {
      vi.useRealTimers();
      attempts = 0;
      onButtonNotPressed = () => undefined;
      server = await startMockTlsServer((_request, response) => {
        attempts++;
        response.setHeader('content-type', 'application/json');

        if (attempts === 1) {
          onButtonNotPressed(response);
          response.statusCode = 403;
          response.end('{"error":"user:creation-not-enabled"}');
          return;
        }

        response.end(JSON.stringify(mockV2UserCreated));
      });
    });

    afterEach(async () => {
      await server.close();
      // The global afterEach in vitest.setup.ts runs the fake timers
      vi.useFakeTimers();
    });

    it('should learn the identifier from the certificate', async () => {
      const result = await pair(server.host, 'new_user', { ca: mockTlsCa, interval: 10 });

      expect(result).toStrictEqual({
        host: server.host,
        token: mockV2UserCreated.token,
        identifier: mockTlsIdentifier,
      });
      expect(attempts).toBe(2);
    });

    it('should refuse the token when different devices answered during pairing', async () => {
      onButtonNotPressed = response => {
        // A new connection, so the next attempt meets the other device's certificate
        response.setHeader('connection', 'close');
        server.useOtherDevice();
      };

      const error = await pair(server.host, 'new_user', { ca: mockTlsCa, interval: 10 }).catch(
        error => error,
      );

      expect(error).toBeInstanceOf(HomeWizardError);
      expect(error.kind).toBe('certificate');
      expect(error.message).toBe(
        `Different devices answered at this address during pairing (${mockTlsIdentifier}, ${mockTlsOtherIdentifier}), so the token can't be trusted`,
      );
      expect(attempts).toBe(2);
    });

    it('should accept the certificate of the given identifier', async () => {
      await expect(
        pair(server.host, 'new_user', {
          ca: mockTlsCa,
          interval: 10,
          identifier: mockTlsIdentifier,
        }),
      ).resolves.toMatchObject({ identifier: mockTlsIdentifier });
    });

    it('should return the given identifier without checking the certificate when insecure', async () => {
      await expect(
        pair(server.host, 'new_user', {
          insecure: true,
          interval: 10,
          identifier: mockTlsOtherIdentifier,
        }),
      ).resolves.toMatchObject({ identifier: mockTlsOtherIdentifier });
      expect(attempts).toBe(2);
    });

    it('should stop straight away for a certificate of another identifier', async () => {
      const error = await pair(server.host, 'new_user', {
        ca: mockTlsCa,
        identifier: 'appliance/p1dongle/000000000000',
      }).catch(error => error);

      expect(error).toBeInstanceOf(HomeWizardError);
      expect(error.kind).toBe('certificate');
      expect(error.cause.code).toBe(CERTIFICATE_IDENTITY_ERROR_CODE);
      expect(attempts).toBe(0);
    });

    it('should stop straight away for a certificate the HomeWizard CA did not sign', async () => {
      const error = await pair(server.host, 'new_user').catch(error => error);

      expect(error.kind).toBe('certificate');
      expect(error.cause.code).toMatch(/CERT|SIGNATURE|ISSUER/);
      expect(attempts).toBe(0);
    });
  });
});
