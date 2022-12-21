import { mockApiPool, mockApiUrl } from '@/mocks/api';

import {
  BaseApi,
  DEFAULT_API_VERSION,
  DEFAULT_BODY_TIMEOUT,
  DEFAULT_HEADERS_TIMEOUT,
  HomeWizardEnergyApiError,
  HomeWizardEnergyApiResponseError,
} from '@/base-api';
import { Dispatcher } from 'undici';
import { mockP1MeterDataResponse } from './mocks/data/data';
import EventEmitter from 'events';

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

  describe('instance', () => {
    it('should be able to create a new instance', () => {
      expect(baseApi).toBeTruthy();
    });

    it('should have a logger instance', () => {
      expect(baseApi['log']).toBeTruthy();
    });

    it('should have the default requestOptions set', () => {
      expect(baseApi['requestOptions']).toBeTruthy();
      expect(baseApi['requestOptions']?.bodyTimeout).toBe(DEFAULT_BODY_TIMEOUT);
      expect(baseApi['requestOptions']?.headersTimeout).toBe(DEFAULT_HEADERS_TIMEOUT);
    });

    it('should have the apiVersion set', () => {
      expect(baseApi['apiVersion']).toBe(DEFAULT_API_VERSION);
    });

    it('should have the baseUrl set', () => {
      expect(baseApi['baseUrl']).toBe(mockApiUrl);
    });

    it('should have the eventEmitter set', () => {
      expect(baseApi['eventEmitter']).toBeTruthy();
      expect(baseApi['eventEmitter']).toBeInstanceOf(EventEmitter);
    });

    it('should have the endpoints set', () => {
      expect(baseApi['endpoints']).toBeTruthy();
      expect(baseApi['endpoints'].basic).toBe(`${mockApiUrl}/api`);
      expect(baseApi['endpoints'].data).toBe(`${mockApiUrl}/api/${DEFAULT_API_VERSION}/data`);
    });
  });

  describe('throwResponseError()', () => {
    it('should throw a HomeWizardEnergyApiResponseError instance', async () => {
      const mockUrl = 'http://localhost/api/v1/data';
      const mockMethod = 'GET';
      const mockStatusCode = 500;
      const mockResponseData = 'Test response data';

      const errorFn = async () =>
        await baseApi['throwResponseError'](mockUrl, mockMethod, {
          body: {
            text: vi.fn().mockResolvedValue(mockResponseData),
          },
          statusCode: mockStatusCode,
        } as unknown as Dispatcher.ResponseData);

      expect(errorFn()).rejects.toBeInstanceOf(HomeWizardEnergyApiResponseError);
      expect(errorFn()).rejects.toThrowError(
        `Api ${mockMethod} call at ${mockUrl} failed with status ${mockStatusCode} and response data: ${mockResponseData}`,
      );
    });
  });

  describe('isResponseOk()', () => {
    it('should return true when the response status code is 200', () => {
      const response = {
        statusCode: 200,
      } as Dispatcher.ResponseData;

      expect(baseApi['isResponseOk'](response)).toBe(true);
    });

    it('should return false when the response status code is above 300', () => {
      const response = {
        statusCode: 500,
      } as Dispatcher.ResponseData;

      expect(baseApi['isResponseOk'](response)).toBe(false);
    });
  });

  describe('request()', () => {
    it('should return the response data when the response status code is 200', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/data`,
          method: 'GET',
        })
        .reply(() => ({
          data: mockP1MeterDataResponse,
          statusCode: 200,
        }));

      const response = await baseApi['request']('http://localhost/api/v1/data', {
        method: 'GET',
      });

      expect(await response.body.json()).toMatchObject(mockP1MeterDataResponse);
    });
  });

  describe('errors', () => {
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
