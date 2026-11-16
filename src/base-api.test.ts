import { apiMocks, mockApiPool, mockApiUrl } from '@/mocks/api';

import {
  BaseApi,
  DEFAULT_API_VERSION,
  DEFAULT_BODY_TIMEOUT,
  DEFAULT_HEADERS_TIMEOUT,
  DEFAULT_TIMEOUT,
  HomeWizardEnergyApiError,
  HomeWizardEnergyApiResponseError,
  HomeWizardEnergyApiTimeoutError,
} from '@/base-api';
import { Dispatcher } from 'undici';
import { mockP1MeterDataResponse } from './mocks/data/data';
import EventEmitter from 'events';
import { mockErrorInvalidValue } from './mocks/errors';
import { ErrorCodes } from './types';

let baseApi: BaseApi;

const loggerSpy = vi.fn();

/** Lets pending promise callbacks run, because the fake timers don't advance them. */
async function flushPromises() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

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

    it('should remove trailing slashes from the baseUrl', () => {
      const api = new BaseApi(`${mockApiUrl}//`);

      expect(api['baseUrl']).toBe(mockApiUrl);
      expect(api['endpoints'].data).toBe(`${mockApiUrl}/api/v1/data`);
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

      await expect(errorFn()).rejects.toBeInstanceOf(HomeWizardEnergyApiResponseError);
      await expect(errorFn()).rejects.toThrowError(
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
      apiMocks.getData({
        response: mockP1MeterDataResponse,
      });

      const response = await baseApi['request']('http://localhost/api/v1/data', {
        method: 'GET',
      });

      expect(await response.body.json()).toMatchObject(mockP1MeterDataResponse);
    });

    it('should use a timeout of 5 seconds by default', () => {
      expect(DEFAULT_TIMEOUT).toBe(5000);
      expect(baseApi['timeout']).toBe(DEFAULT_TIMEOUT);
    });

    it('should throw a HomeWizardEnergyApiTimeoutError when the request takes longer than the timeout', async () => {
      mockApiPool
        .intercept({ path: '/api/v1/data', method: 'GET' })
        .reply(200, mockP1MeterDataResponse)
        .delay(10000);

      const request = baseApi['request']('http://localhost/api/v1/data', { method: 'GET' });
      const assertion = expect(request).rejects.toThrowError(
        new HomeWizardEnergyApiTimeoutError(
          'Api GET call at http://localhost/api/v1/data timed out after 5000ms',
          'http://localhost/api/v1/data',
          5000,
        ),
      );

      vi.advanceTimersByTime(DEFAULT_TIMEOUT);

      await assertion;
      await expect(request).rejects.toMatchObject({
        name: 'HomeWizardEnergyApiTimeoutError',
        url: 'http://localhost/api/v1/data',
        timeout: 5000,
      });
    });

    it('should mention GET in the timeout error when no method is given', async () => {
      mockApiPool
        .intercept({ path: '/api/v1/data', method: 'GET' })
        .reply(200, mockP1MeterDataResponse)
        .delay(10000);

      const request = baseApi['request']('http://localhost/api/v1/data', undefined);
      const assertion = expect(request).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/data timed out after 5000ms',
      );

      vi.advanceTimersByTime(DEFAULT_TIMEOUT);

      await assertion;
    });

    it('should rethrow other request errors as is', async () => {
      mockApiPool
        .intercept({ path: '/api/v1/data', method: 'GET' })
        .replyWithError(new Error('socket hang up'));

      await expect(
        baseApi['request']('http://localhost/api/v1/data', { method: 'GET' }),
      ).rejects.toThrowError('socket hang up');
    });

    it('should not use the timeout when it is set to 0', async () => {
      const api = new BaseApi(mockApiUrl, { timeout: 0 });

      apiMocks.getData({
        response: mockP1MeterDataResponse,
      });

      const response = await api['request']('http://localhost/api/v1/data', { method: 'GET' });

      expect(response.statusCode).toBe(200);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should not use the timeout when a signal is passed', async () => {
      const signal = new EventEmitter();

      apiMocks.getData({
        response: mockP1MeterDataResponse,
      });

      const response = await baseApi['request']('http://localhost/api/v1/data', {
        method: 'GET',
        signal,
      });

      expect(response.statusCode).toBe(200);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('parseJsonResponse()', () => {
    it('should throw a HomeWizardEnergyApiResponseError when the body is not valid JSON', async () => {
      apiMocks.getData({
        response: '<html>Not JSON</html>',
      });

      const error = await baseApi['getData']().catch(error => error);

      expect(error).toBeInstanceOf(HomeWizardEnergyApiResponseError);
      expect(error).toMatchObject({
        message:
          'Api GET call at http://localhost/api/v1/data returned a response that is not valid JSON: <html>Not JSON</html>',
        url: 'http://localhost/api/v1/data',
        statusCode: 200,
        response: '<html>Not JSON</html>',
      });
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
      expect(error.apiError).toBeUndefined();

      expect(error.toString()).toBe('HomeWizardEnergyApiResponseError: Test error');
    });

    it('should parse the API error object from a JSON response body', () => {
      const error = new HomeWizardEnergyApiResponseError(
        'Test error',
        'http://localhost/api/v1/state',
        400,
        JSON.stringify(mockErrorInvalidValue),
      );

      expect(error.apiError).toStrictEqual(mockErrorInvalidValue.error);
      expect(error.apiError?.id).toBe(ErrorCodes.INVALID_VALUE_FOR_PARAMETER);
    });

    it('should keep REQUEST_TO_LONG as an alias of REQUEST_TOO_LARGE', () => {
      expect(ErrorCodes.REQUEST_TOO_LARGE).toBe(201);
      expect(ErrorCodes.REQUEST_TO_LONG).toBe(ErrorCodes.REQUEST_TOO_LARGE);
      expect(ErrorCodes[201]).toBe('REQUEST_TO_LONG');
    });

    it('should leave apiError undefined for JSON that is not an API error object', () => {
      const error = new HomeWizardEnergyApiResponseError(
        'Test error',
        'http://localhost/api/v1/state',
        400,
        JSON.stringify({ error: 'nope' }),
      );

      expect(error.apiError).toBeUndefined();
    });
  });

  describe('polling', () => {
    it('should also emit unscoped events to listeners added with the protected on()', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: mockP1MeterDataResponse,
        });

        baseApi['on']('response', response => {
          baseApi.polling.getData.stop();

          expect(response).toStrictEqual(mockP1MeterDataResponse);
          done(true);
        });

        baseApi.polling.getData.start();
      }));

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

    it('should return nothing when stop() is invoked while not polling', () => {
      const method = 'getData';

      baseApi.polling[method].stop();

      expect(baseApi['stopPolling'](method)).toBeUndefined();
    });

    it('should set an active polling run for getData when start() is invoked', () => {
      const method = 'getData';

      baseApi.polling[method].start();

      expect(baseApi['activePollingRuns'][method]).toBeDefined();
    });

    it('should clear the active polling run for getData when stop() is invoked', () => {
      const method = 'getData';

      baseApi.polling[method].start();
      baseApi.polling[method].stop();

      expect(baseApi['activePollingRuns'][method]).toBeUndefined();
    });

    it('should not start a second loop when start() is invoked while polling', async () => {
      const apiMethod = vi.fn().mockResolvedValue('ok');

      const firstRun = baseApi['startPolling']('getData', apiMethod);
      await baseApi['startPolling']('getData', apiMethod);

      expect(apiMethod).toHaveBeenCalledOnce();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[HomeWizard Energy API]:',
        'Polling for "getData" is already started.',
      );

      baseApi['stopPolling']('getData');
      await flushPromises();
      vi.advanceTimersByTime(1000);
      await firstRun;
    });

    it('should end the previous loop when stop() and start() are invoked within one interval', async () => {
      const apiMethod = vi.fn().mockResolvedValue('ok');

      const firstRun = baseApi['startPolling']('getData', apiMethod);
      await flushPromises();

      baseApi['stopPolling']('getData');
      const secondRun = baseApi['startPolling']('getData', apiMethod);
      await flushPromises();

      vi.advanceTimersByTime(1000);
      await firstRun;
      await flushPromises();

      // The first loop ended, so only the second loop requested again
      expect(apiMethod).toHaveBeenCalledTimes(3);

      baseApi['stopPolling']('getData');
      vi.advanceTimersByTime(1000);
      await secondRun;
    });

    it('should not emit a response that arrives after stop() is invoked', async () => {
      let resolveRequest: (value: string) => void = () => undefined;
      const apiMethod = vi.fn(() => new Promise<string>(resolve => (resolveRequest = resolve)));
      const responseListener = vi.fn();

      baseApi.polling.getData.on('response', responseListener);

      const run = baseApi['startPolling']('getData', apiMethod);
      baseApi['stopPolling']('getData');
      resolveRequest('ok');
      await run;

      expect(responseListener).not.toHaveBeenCalled();
    });

    it('should not emit an error that arrives after stop() is invoked', async () => {
      let rejectRequest: (reason: Error) => void = () => undefined;
      const apiMethod = vi.fn(() => new Promise<string>((_, reject) => (rejectRequest = reject)));
      const errorListener = vi.fn();

      baseApi.polling.getData.on('error', errorListener);

      const run = baseApi['startPolling']('getData', apiMethod);
      baseApi['stopPolling']('getData');
      rejectRequest(new Error('Too late'));
      await run;

      expect(errorListener).not.toHaveBeenCalled();
    });

    it('should keep polling when an error listener throws', async () => {
      const apiMethod = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockResolvedValue('ok');

      baseApi.polling.getData.on('error', () => {
        throw new Error('Listener failed');
      });

      const run = baseApi['startPolling']('getData', apiMethod);
      await flushPromises();

      expect(loggerSpy).toHaveBeenCalledWith(
        '[HomeWizard Energy API]:',
        'Received error while polling "getData": Error: Request failed',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        '[HomeWizard Energy API]:',
        'An "error" listener for polling "getData" threw: Error: Listener failed',
      );

      vi.advanceTimersByTime(1000);
      await flushPromises();

      expect(apiMethod).toHaveBeenCalledTimes(2);

      baseApi['stopPolling']('getData');
      vi.advanceTimersByTime(1000);
      await run;
    });

    it('should return nothing from start()', () => {
      const startPollingSpy = vi.fn().mockResolvedValue(undefined);

      baseApi['startPolling'] = startPollingSpy;

      expect(baseApi.polling.getData.start()).toBeUndefined();
    });

    it('should emit an error when a response listener throws', async () => {
      const apiMethod = vi.fn().mockResolvedValue('ok');
      const listenerError = new Error('Response listener failed');
      const errorListener = vi.fn();

      baseApi.polling.getData.on('response', () => {
        throw listenerError;
      });
      baseApi.polling.getData.on('error', errorListener);

      const run = baseApi['startPolling']('getData', apiMethod);
      await flushPromises();

      expect(errorListener).toHaveBeenCalledWith(listenerError);

      baseApi['stopPolling']('getData');
      vi.advanceTimersByTime(1000);
      await run;
    });

    it('should log errors that cannot be converted to JSON as a string', async () => {
      const circularError: Record<string, unknown> = {};
      circularError.self = circularError;
      const apiMethod = vi.fn().mockRejectedValue(circularError);

      const run = baseApi['startPolling']('getData', apiMethod);
      await flushPromises();

      expect(loggerSpy).toHaveBeenCalledWith(
        '[HomeWizard Energy API]:',
        'Received error while polling "getData": [object Object]',
      );

      baseApi['stopPolling']('getData');
      vi.advanceTimersByTime(1000);
      await run;
    });

    it('should log errors that are not an Error as JSON', async () => {
      const apiMethod = vi.fn().mockRejectedValue({ code: 'ECONNRESET' });

      const run = baseApi['startPolling']('getData', apiMethod);
      await flushPromises();

      expect(loggerSpy).toHaveBeenCalledWith(
        '[HomeWizard Energy API]:',
        'Received error while polling "getData": {"code":"ECONNRESET"}',
      );

      baseApi['stopPolling']('getData');
      vi.advanceTimersByTime(1000);
      await run;
    });
  });
});
