import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { apiMocks, mockApiUrl } from '@/mocks/api';
import { mockWaterMeterDataResponse } from '@/mocks/data/data';
import { WaterMeterApi } from '@/water-meter-api';

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

  it('should GET the "basic" endpoint', async () => {
    apiMocks.getBasicInformation({
      response: mockBasicResponse,
    });

    const basicInformation = await waterMeterApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
  });

  it('should GET the "data" endpoint', async () => {
    apiMocks.getData({
      response: mockWaterMeterDataResponse,
    });

    const data = await waterMeterApi.getData();

    expect(data).toStrictEqual(mockWaterMeterDataResponse);
  });

  describe('polling.start()', () => {
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
  });

  describe('polling', () => {
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
});
