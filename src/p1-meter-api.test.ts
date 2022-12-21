import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { apiMocks, mockApiUrl } from '@/mocks/api';
import { mockP1MeterDataResponse } from '@/mocks/data/data';
import { mockParsedTelegramResponse, mockTelegramResponse } from '@/mocks/data/telegram';
import { P1MeterApi } from '@/p1-meter-api';

let p1MeterApi: P1MeterApi;

const mockBasicResponse = mockBasicInformationResponse['HWE-P1'];

describe('HomeWizardEnergyApi', () => {
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

  describe('getBasic()', () => {
    it('should return the basic information response from /api/v1/basic', async () => {
      apiMocks.getBasicInformation({
        response: mockBasicResponse,
      });

      const basicInformation = await p1MeterApi.getBasicInformation();

      expect(basicInformation).toStrictEqual(mockBasicResponse);
    });
  });

  describe('getData()', () => {
    it('should return the data response from /api/v1/date', async () => {
      apiMocks.getData({
        response: mockP1MeterDataResponse,
      });

      const data = await p1MeterApi.getData();

      expect(data).toStrictEqual(mockP1MeterDataResponse);
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

    it('should throw an error when /api/v1/telegram returns an error response', async () => {
      apiMocks.getTelegram({
        response: 'Server error!',
        statusCode: 500,
      });

      const responseFn = () => p1MeterApi.getTelegram();

      expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/telegram failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('getParsedTelegram()', () => {
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

      expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/telegram failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('polling.getData', () => {
    it('should should invoke startPolling() when invoking start()', async () => {
      const startPollingSpy = vi.fn();

      p1MeterApi['startPolling'] = startPollingSpy;
      p1MeterApi.polling.getData.start();

      expect(startPollingSpy).toHaveBeenCalledOnce();
    });

    it('should should invoke stopPolling() when invoking stop()', async () => {
      const stopPollingSpy = vi.fn();

      p1MeterApi['stopPolling'] = stopPollingSpy;
      p1MeterApi.polling.getData.start();
      p1MeterApi.polling.getData.stop();

      expect(stopPollingSpy).toHaveBeenCalledOnce();
      expect(stopPollingSpy).toHaveBeenCalledWith('getData');
    });

    it('should get a response event when polling /api/v1/data', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: mockP1MeterDataResponse,
        });

        p1MeterApi.polling.getData.start();

        p1MeterApi.polling.getData.on('response', response => {
          expect(response).toStrictEqual(mockP1MeterDataResponse);
          done(true);
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
  });
});
