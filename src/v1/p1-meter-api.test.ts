import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { apiMocks, HTML_HEADERS, mockApiUrl } from '@/mocks/api';
import { mockErrorNotFound } from '@/mocks/errors';
import { HomeWizardEnergyApiResponseError } from '@/v1/base-api';
import {
  mockP1MeterDataResponse,
  mockP1MeterDataResponseWithExternalPower,
} from '@/mocks/data/data';
import { mockParsedTelegramResponse, mockTelegramResponse } from '@/mocks/data/telegram';
import { P1MeterApi } from '@/v1/p1-meter-api';
import { mockSystemResponse } from '../mocks/data/system';
import { mockIdentifyResponse } from '../mocks/data/identify';

let p1MeterApi: P1MeterApi;

const mockBasicResponse = mockBasicInformationResponse['HWE-P1'];

describe('P1MeterApi', () => {
  beforeEach(() => {
    p1MeterApi = new P1MeterApi(mockApiUrl, {
      polling: {
        interval: 10,
      },
    });
  });

  describe('constructor', () => {
    it('should be able to create a new instance', () => {
      expect(p1MeterApi).toBeTruthy();
    });

    it('should trigger the logger when doing requests', async () => {
      const loggerSpy = vi.fn();

      const p1MeterApiWithLogger = new P1MeterApi(mockApiUrl, {
        logger: {
          method: loggerSpy,
        },
      });

      apiMocks.getBasicInformation({
        response: mockBasicResponse,
      });

      await p1MeterApiWithLogger.getBasicInformation();

      expect(p1MeterApiWithLogger).toBeTruthy();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('getBasicInformation()', () => {
    it('should return the basic information response from /api', async () => {
      apiMocks.getBasicInformation({
        response: mockBasicResponse,
      });

      const basicInformation = await p1MeterApi.getBasicInformation();

      expect(basicInformation).toStrictEqual(mockBasicResponse);
    });

    it('should throw an error when GET the "basic" endpoint returns a server error', async () => {
      apiMocks.getBasicInformation({
        response: 'Server error!',
        statusCode: 500,
      });

      await expect(p1MeterApi.getBasicInformation()).rejects.toThrowError(
        'Api GET call at http://localhost/api failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('getData()', () => {
    it('should return the data response from /api/v1/data', async () => {
      apiMocks.getData({
        response: mockP1MeterDataResponse,
      });

      const data = await p1MeterApi.getData();

      expect(data).toStrictEqual(mockP1MeterDataResponse);
    });

    it('should return the data response with the Belgian capacity tariff fields', async () => {
      apiMocks.getData({
        response: mockP1MeterDataResponseWithExternalPower,
      });

      const data = await p1MeterApi.getData();

      expect(data).toStrictEqual(mockP1MeterDataResponseWithExternalPower);
      expect(data.active_power_average_w).toBe(123);
      expect(data.montly_power_peak_w).toBe(1111);
    });

    it('should throw an error when GET the "data" endpoint returns a server error', async () => {
      apiMocks.getData({
        response: 'Server error!',
        statusCode: 500,
      });

      await expect(p1MeterApi.getData()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/data failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('getTelegram()', () => {
    it('should return a telegram response from /api/v1/telegram', async () => {
      apiMocks.getTelegram({
        response: mockTelegramResponse['v50l3_2'],
      });

      const data = await p1MeterApi.getTelegram();

      expect(data).toStrictEqual(mockTelegramResponse['v50l3_2']);
    });

    it('should return a CRLF telegram as is', async () => {
      apiMocks.getTelegram({
        response: mockTelegramResponse['v50l3_3'],
      });

      const data = await p1MeterApi.getTelegram();

      expect(data).toBe(mockTelegramResponse['v50l3_3']);
      expect(data).toContain('\r\n');
    });

    it('should throw an error with the plain-text body when the device has no /api/v1/telegram', async () => {
      apiMocks.getTelegram({
        response: mockErrorNotFound,
        statusCode: 404,
        headers: HTML_HEADERS,
      });

      const error = await p1MeterApi.getTelegram().catch(error => error);

      expect(error).toBeInstanceOf(HomeWizardEnergyApiResponseError);
      expect(error).toMatchObject({
        message: `Api GET call at http://localhost/api/v1/telegram failed with status 404 and response data: ${mockErrorNotFound}`,
        statusCode: 404,
        response: mockErrorNotFound,
        apiError: undefined,
      });
    });

    it('should throw an error when /api/v1/telegram returns an error response', async () => {
      apiMocks.getTelegram({
        response: 'Server error!',
        statusCode: 500,
      });

      const responseFn = () => p1MeterApi.getTelegram();

      await expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/telegram failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('getParsedTelegram()', () => {
    it('should log telegram lines it cannot parse with the logger', async () => {
      const loggerSpy = vi.fn();
      const api = new P1MeterApi(mockApiUrl, { logger: { method: loggerSpy } });

      apiMocks.getTelegram({
        response: '/ISK5\\2M550T-1012\n\n1-3:0.2.8(50)\nnot a telegram line\n!',
      });

      await api.getParsedTelegram();

      expect(loggerSpy).toHaveBeenCalledWith(
        '[HomeWizard Energy API]:',
        'Unable to parse line: not a telegram line',
      );
    });

    it('should return a parsed telegram response from /api/v1/telegram', async () => {
      apiMocks.getTelegram({
        response: mockTelegramResponse['v50l3_2'],
      });

      const data = await p1MeterApi.getParsedTelegram();

      expect(data).toStrictEqual(mockParsedTelegramResponse['v50l3_2']);
    });

    it('should throw an error when /api/v1/telegram returns an error response', async () => {
      apiMocks.getTelegram({
        response: 'Server error!',
        statusCode: 500,
      });

      const responseFn = () => p1MeterApi.getParsedTelegram();

      await expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/telegram failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('getSystem()', () => {
    it('should GET the "system" endpoint', async () => {
      apiMocks.getSystem({
        response: mockSystemResponse,
      });

      const state = await p1MeterApi.getSystem();

      expect(state).toStrictEqual(mockSystemResponse);
    });

    it('should throw an error when GET the "system" endpoint returns a server error', async () => {
      apiMocks.getSystem({
        response: 'Server error!',
        statusCode: 500,
      });

      const responseFn = () => p1MeterApi.getSystem();

      await expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('updateSystem()', () => {
    it('should PUT the "system" endpoint', async () => {
      const updatedCloudEnabled = false;

      apiMocks.updateSystem({
        response: {
          cloud_enabled: updatedCloudEnabled,
        },
      });

      const system = await p1MeterApi.updateSystem({
        cloud_enabled: updatedCloudEnabled,
      });

      expect(system.cloud_enabled).toBe(updatedCloudEnabled);
    });

    it('should throw an error on PUT when the "system" endpoint returns a server error', async () => {
      apiMocks.updateSystem({
        response: 'Server error!',
        statusCode: 500,
      });

      const responseFn = () =>
        p1MeterApi.updateSystem({
          cloud_enabled: true,
        });

      await expect(responseFn()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('identify()', () => {
    it('should PUT the "identify" endpoint', async () => {
      apiMocks.identify({
        response: mockIdentifyResponse,
      });

      const identify = await p1MeterApi.identify();

      expect(identify).toStrictEqual(mockIdentifyResponse);
    });

    it('should throw an error when PUT on the "identify" endpoint returns a server error', async () => {
      apiMocks.identify({
        response: 'Server error!',
        statusCode: 500,
      });

      const responseFn = () => p1MeterApi.identify();

      await expect(responseFn()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/identify failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('polling.getData()', () => {
    it('should start polling getData when start() is invoked', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: mockP1MeterDataResponse,
        });

        p1MeterApi.polling.getData.start();

        p1MeterApi.polling.getData.on('response', response => {
          expect(response).toStrictEqual(mockP1MeterDataResponse);
          done(mockP1MeterDataResponse);
        });
      }));

    it('should get a error event when polling /api/v1/data', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: 'Server error!',
          statusCode: 500,
        });

        p1MeterApi.polling.getData.start();

        p1MeterApi.polling.getData.on('error', error => {
          try {
            expect(error).toThrowError();
          } finally {
            done(true);
          }
        });
      }));

    it('should stop polling when stopOnError: true is passed as an option', async () =>
      new Promise(done => {
        const p1MeterWithStopOnError = new P1MeterApi(mockApiUrl, {
          polling: {
            interval: 10,
            stopOnError: true,
          },
        });

        apiMocks.getData({
          response: 'Server error!',
          statusCode: 500,
        });

        const stopPollingSpy = vi.fn();

        p1MeterWithStopOnError['stopPolling'] = stopPollingSpy;

        p1MeterWithStopOnError.polling.getData.start();

        p1MeterWithStopOnError.polling.getData.on('error', () => {
          expect(stopPollingSpy).toHaveBeenCalledTimes(1);
          done(true);
        });
      }));

    it('should start polling getTelegram when start() is invoked', async () =>
      new Promise(done => {
        apiMocks.getTelegram({
          response: mockTelegramResponse['v50l3_2'],
        });

        p1MeterApi.polling.getTelegram.start();

        p1MeterApi.polling.getTelegram.on('response', response => {
          expect(response).toBe(mockTelegramResponse['v50l3_2']);
          done(mockTelegramResponse['v50l3_2']);
        });
      }));

    it('should only emit responses of the polled method to its listeners', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: mockP1MeterDataResponse,
        });
        apiMocks.getTelegram({
          response: mockTelegramResponse['v50l3_2'],
        });

        const dataResponses: unknown[] = [];
        const telegramResponses: unknown[] = [];

        const checkDone = () => {
          if (!dataResponses.length || !telegramResponses.length) return;

          p1MeterApi.polling.getData.stop();
          p1MeterApi.polling.getTelegram.stop();

          expect(dataResponses).toStrictEqual([mockP1MeterDataResponse]);
          expect(telegramResponses).toStrictEqual([mockTelegramResponse['v50l3_2']]);
          done(true);
        };

        p1MeterApi.polling.getData.on('response', response => {
          dataResponses.push(response);
          checkDone();
        });

        p1MeterApi.polling.getTelegram.on('response', response => {
          telegramResponses.push(response);
          checkDone();
        });

        p1MeterApi.polling.getData.start();
        p1MeterApi.polling.getTelegram.start();
      }));

    it('should stop polling getTelegram and getParsedTelegram when stop() is invoked', () => {
      p1MeterApi['activePollingRuns']['getTelegram'] = {};
      p1MeterApi['activePollingRuns']['getParsedTelegram'] = {};

      p1MeterApi.polling.getTelegram.stop();
      p1MeterApi.polling.getParsedTelegram.stop();

      expect(p1MeterApi['activePollingRuns']['getTelegram']).toBeUndefined();
      expect(p1MeterApi['activePollingRuns']['getParsedTelegram']).toBeUndefined();
    });

    it('should start polling getParsedTelegram when start() is invoked', async () =>
      new Promise(done => {
        apiMocks.getTelegram({
          response: mockTelegramResponse['v50l3_2'],
        });

        p1MeterApi.polling.getParsedTelegram.start();

        p1MeterApi.polling.getParsedTelegram.on('response', response => {
          expect(response).toStrictEqual(mockParsedTelegramResponse['v50l3_2']);
          done(mockParsedTelegramResponse['v50l3_2']);
        });
      }));
  });
});
