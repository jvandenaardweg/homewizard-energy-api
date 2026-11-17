import { HomeWizardEnergyApiResponseError, HomeWizardEnergyApiTimeoutError } from '@/shared/errors';
import { createResponseError, HomeWizardError, parseErrorCode, toHomeWizardError } from './errors';

describe('errors', () => {
  describe('parseErrorCode', () => {
    it('should read the code from a JSON body', () => {
      expect(parseErrorCode('{"error":"user:unauthorized"}')).toBe('user:unauthorized');
      expect(
        parseErrorCode('{"error":"json:parameter-invalid-type:status_led_brightness_pct"}'),
      ).toBe('json:parameter-invalid-type:status_led_brightness_pct');
    });

    it('should read the code from a plain-text body', () => {
      expect(parseErrorCode('telegram:no-telegram-received\n')).toBe(
        'telegram:no-telegram-received',
      );
    });

    it('should return undefined for a body without a code', () => {
      expect(parseErrorCode('')).toBeUndefined();
      expect(parseErrorCode('null')).toBeUndefined();
      expect(parseErrorCode('{"error":{"id":7}}')).toBeUndefined();
      expect(parseErrorCode('<html>Not Found</html>')).toBeUndefined();
    });
  });

  describe('HomeWizardError', () => {
    it('should set the kind, the details and the cause', () => {
      const cause = new Error('socket hang up');
      const error = new HomeWizardError('network', 'failed', { url: 'https://x/api', cause });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('HomeWizardError');
      expect(error.kind).toBe('network');
      expect(error.url).toBe('https://x/api');
      expect(error.cause).toBe(cause);
      expect(new HomeWizardError('invalid', 'bad').cause).toBeUndefined();
    });

    it('should set the code, the status and the body of a response error', () => {
      const error = createResponseError(
        'GET',
        'https://x/api',
        401,
        '{"error":"user:unauthorized"}',
      );

      expect(error.kind).toBe('response');
      expect(error.code).toBe('user:unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.response).toBe('{"error":"user:unauthorized"}');
      expect(error.message).toBe(
        'Api GET call at https://x/api failed with status 401 and response data: {"error":"user:unauthorized"}',
      );
    });
  });

  describe('toHomeWizardError', () => {
    const url = 'https://x/api';

    it('should keep a HomeWizardError', () => {
      const error = new HomeWizardError('invalid', 'bad');

      expect(toHomeWizardError(error, 'GET', url)).toBe(error);
    });

    it('should turn a timeout into a timeout error', () => {
      const error = toHomeWizardError(
        new HomeWizardEnergyApiTimeoutError('timed out after 5ms', url, 5),
        'GET',
        url,
      );

      expect(error).toMatchObject({
        kind: 'timeout',
        message: 'timed out after 5ms',
        url,
        timeout: 5,
      });
    });

    it('should turn a body that is not JSON into a response error', () => {
      const error = toHomeWizardError(
        new HomeWizardEnergyApiResponseError('not JSON', url, 200, '<html>'),
        'GET',
        url,
      );

      expect(error).toMatchObject({ kind: 'response', statusCode: 200, response: '<html>' });
    });

    it('should turn a refused certificate into a certificate error', () => {
      const cause = Object.assign(new Error('self-signed certificate'), {
        code: 'SELF_SIGNED_CERT_IN_CHAIN',
      });
      const error = toHomeWizardError(cause, 'GET', url);

      expect(error.kind).toBe('certificate');
      expect(error.message).toBe(
        'The certificate of the device at https://x/api was refused: self-signed certificate',
      );
      expect(error.cause).toBe(cause);
    });

    it('should turn anything else into a network error', () => {
      expect(toHomeWizardError(new Error('ECONNREFUSED'), 'GET', url)).toMatchObject({
        kind: 'network',
        message: 'Api GET call at https://x/api failed: ECONNREFUSED',
      });
      expect(toHomeWizardError('offline', 'PUT', url).message).toBe(
        'Api PUT call at https://x/api failed: offline',
      );
    });
  });
});
