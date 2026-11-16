import { HomeWizardEnergyApiError, HomeWizardEnergyApiResponseError } from '@/shared/errors';
import {
  HomeWizardApiV2Error,
  HomeWizardApiV2PairingError,
  HomeWizardApiV2WebSocketError,
  parseErrorCode,
} from './errors';

describe('v2/errors', () => {
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

  it('should set the code on a HomeWizardApiV2Error and keep the response error fields', () => {
    const error = new HomeWizardApiV2Error(
      'failed',
      'https://x/api',
      401,
      '{"error":"user:unauthorized"}',
    );

    expect(error).toBeInstanceOf(HomeWizardEnergyApiResponseError);
    expect(error.name).toBe('HomeWizardApiV2Error');
    expect(error.code).toBe('user:unauthorized');
    expect(error.statusCode).toBe(401);
    expect(error.url).toBe('https://x/api');
    expect(error.apiError).toBeUndefined();
  });

  it('should set the reason on a HomeWizardApiV2PairingError', () => {
    const error = new HomeWizardApiV2PairingError('timed out', 'timeout');

    expect(error).toBeInstanceOf(HomeWizardEnergyApiError);
    expect(error.name).toBe('HomeWizardApiV2PairingError');
    expect(error.reason).toBe('timeout');
  });

  it('should set the code on a HomeWizardApiV2WebSocketError', () => {
    const error = new HomeWizardApiV2WebSocketError('bad', 'request:unknown-type');

    expect(error).toBeInstanceOf(HomeWizardEnergyApiError);
    expect(error.name).toBe('HomeWizardApiV2WebSocketError');
    expect(error.code).toBe('request:unknown-type');
    expect(new HomeWizardApiV2WebSocketError('bad').code).toBeUndefined();
  });
});
