import { mockApiUrl } from '@/mocks/api';

import { BaseApi, HomeWizardEnergyApiError, HomeWizardEnergyApiResponseError } from '@/base-api';

let baseApi: BaseApi;

const loggerSpy = vi.fn();

describe('BaseApi', () => {
  beforeEach(() => {
    baseApi = new BaseApi(mockApiUrl, {
      logger: {
        method: loggerSpy,
      },
    });
  });

  it('should be able to create a new instance', () => {
    expect(baseApi).toBeTruthy();
  });

  it('should create a HomeWizardEnergyApiError instance', () => {
    const error = new HomeWizardEnergyApiError('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HomeWizardEnergyApiError);
    expect(error.message).toBe('Test error');

    expect(error.toString()).toBe('HomeWizardEnergyApiError: Test error');
  });

  it('should create a HomeWizardEnergyApiResponseError instance', () => {
    const error = new HomeWizardEnergyApiResponseError(
      'Test error',
      'http://localhost/api/v1/data',
      500,
      'Test response data',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HomeWizardEnergyApiResponseError);
    expect(error.message).toBe('Test error');
    expect(error.url).toBe('http://localhost/api/v1/data');
    expect(error.statusCode).toBe(500);
    expect(error.response).toBe('Test response data');

    expect(error.toString()).toBe('HomeWizardEnergyApiResponseError: Test error');
  });

  describe('polling', () => {
    it('should start polling when start() is invoked', () => {
      const startPollingSpy = vi.fn();
      const method = 'getData';

      baseApi['startPolling'] = startPollingSpy;

      baseApi.polling[method].start();

      expect(startPollingSpy).toHaveBeenCalledOnce();
      expect(startPollingSpy.mock.calls[0][0]).toBe(method);
    });

    it('should stop polling when stop() is invoked', () => {
      const stopPollingSpy = vi.fn();
      const method = 'getData';

      baseApi['stopPolling'] = stopPollingSpy;

      baseApi.polling[method].start();
      baseApi.polling[method].stop();

      expect(stopPollingSpy).toHaveBeenCalledOnce();
      expect(stopPollingSpy.mock.calls[0][0]).toBe(method);
    });

    it('should return nothing when stop() is invoked when isPolling is not set', () => {
      const method = 'getData';

      baseApi.polling[method].stop();

      expect(baseApi['stopPolling'](method)).toBeUndefined();
    });

    it('should set isPolling for getData to true when start() is invoked', () => {
      const method = 'getData';

      baseApi.polling[method].start();

      expect(baseApi['isPolling'][method]).toBe(true);
    });

    it('should set isPolling for getData to false when stop() is invoked', () => {
      const method = 'getData';

      baseApi.polling[method].start();
      baseApi.polling[method].stop();

      expect(baseApi['isPolling'][method]).toBe(false);
    });
  });
});
