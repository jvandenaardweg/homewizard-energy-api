import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { apiMocks, mockApiUrl } from '@/mocks/api';
import { mockWaterMeterDataResponse } from '@/mocks/data/data';
import { WaterMeterApi } from '@/v1/water-meter-api';
import { mockSystemResponse } from '@/mocks/data/system';
import { mockIdentifyResponse } from '@/mocks/data/identify';

let waterMeterApi: WaterMeterApi;

const mockBasicResponse = mockBasicInformationResponse['HWE-WTR'];

describe('WaterMeterApi', () => {
  beforeEach(() => {
    waterMeterApi = new WaterMeterApi(mockApiUrl);
  });

  it('should be able to create a new instance', () => {
    expect(waterMeterApi).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();

    const waterMeterApiWithLogger = new WaterMeterApi(mockApiUrl, {
      logger: {
        method: loggerSpy,
      },
    });

    apiMocks.getBasicInformation({
      response: mockBasicResponse,
    });

    await waterMeterApiWithLogger.getBasicInformation();

    expect(waterMeterApiWithLogger).toBeTruthy();
    expect(loggerSpy).toHaveBeenCalled();
  });

  describe('getBasicInformation()', () => {
    it('should GET the "basic" endpoint', async () => {
      apiMocks.getBasicInformation({
        response: mockBasicResponse,
      });

      const basicInformation = await waterMeterApi.getBasicInformation();

      expect(basicInformation).toStrictEqual(mockBasicResponse);
    });

    it('should throw an error when GET the "basic" endpoint returns a server error', async () => {
      apiMocks.getBasicInformation({
        response: 'Server error!',
        statusCode: 500,
      });

      await expect(waterMeterApi.getBasicInformation()).rejects.toThrowError(
        'Api GET call at http://localhost/api failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('getData()', () => {
    it('should GET the "data" endpoint', async () => {
      apiMocks.getData({
        response: mockWaterMeterDataResponse,
      });

      const data = await waterMeterApi.getData();

      expect(data).toStrictEqual(mockWaterMeterDataResponse);
    });

    it('should throw an error when GET the "data" endpoint returns a server error', async () => {
      apiMocks.getData({
        response: 'Server error!',
        statusCode: 500,
      });

      await expect(waterMeterApi.getData()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/data failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('polling.getData()', () => {
    it('should start polling the "data" endpoint', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: mockWaterMeterDataResponse,
        });

        waterMeterApi.polling.getData.start();

        waterMeterApi.polling.getData.on('response', response => {
          expect(response).toMatchObject(mockWaterMeterDataResponse);
          done(response);
        });
      }));

    it('should start polling the "data" endpoint', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: mockWaterMeterDataResponse,
        });

        waterMeterApi.polling.getData.start();

        waterMeterApi.polling.getData.on('response', response => {
          expect(response).toMatchObject(mockWaterMeterDataResponse);
          done(response);
        });
      }));

    it('should stop polling the "data" endpoint', async () => {
      const stopPollingSpy = vi.fn();

      waterMeterApi['stopPolling'] = stopPollingSpy;
      waterMeterApi.polling.getData.start();
      waterMeterApi.polling.getData.stop();

      expect(stopPollingSpy).toHaveBeenCalledOnce();
      expect(stopPollingSpy).toHaveBeenCalledWith('getData');
    });
  });

  describe('getSystem()', () => {
    it('should GET the "system" endpoint', async () => {
      apiMocks.getSystem({
        response: mockSystemResponse,
      });

      const system = await waterMeterApi.getSystem();

      expect(system).toStrictEqual(mockSystemResponse);
    });

    it('should throw an error when GET the "system" endpoint returns a server error', async () => {
      apiMocks.getSystem({
        response: 'Server error!',
        statusCode: 500,
      });

      await expect(waterMeterApi.getSystem()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('updateSystem()', () => {
    it('should PUT the "system" endpoint', async () => {
      apiMocks.updateSystem({
        response: {
          cloud_enabled: false,
        },
      });

      const system = await waterMeterApi.updateSystem({
        cloud_enabled: false,
      });

      expect(system.cloud_enabled).toBe(false);
    });

    it('should throw an error on PUT when the "system" endpoint returns a server error', async () => {
      apiMocks.updateSystem({
        response: 'Server error!',
        statusCode: 500,
      });

      await expect(waterMeterApi.updateSystem({ cloud_enabled: true })).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('identify()', () => {
    it('should PUT the "identify" endpoint', async () => {
      apiMocks.identify({
        response: mockIdentifyResponse,
      });

      const identify = await waterMeterApi.identify();

      expect(identify).toStrictEqual(mockIdentifyResponse);
    });

    it('should throw an error when PUT on the "identify" endpoint returns a server error', async () => {
      apiMocks.identify({
        response: 'Server error!',
        statusCode: 500,
      });

      await expect(waterMeterApi.identify()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/identify failed with status 500 and response data: Server error!',
      );
    });
  });
});
