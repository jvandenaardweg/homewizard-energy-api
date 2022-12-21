import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { mockApiPool, mockApiUrl } from '@/mocks/api';
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

    mockApiPool
      .intercept({
        path: '/api',
        method: 'GET',
      })
      .reply(() => ({
        data: mockBasicResponse,
        statusCode: 200,
      }));

    await waterMeterApiWithLogger.getBasicInformation();

    expect(waterMeterApiWithLogger).toBeTruthy();
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should GET the "basic" endpoint', async () => {
    mockApiPool
      .intercept({
        path: '/api',
        method: 'GET',
      })
      .reply(() => ({
        data: mockBasicResponse,
        statusCode: 200,
      }));

    const basicInformation = await waterMeterApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
  });

  it('should GET the "data" endpoint', async () => {
    mockApiPool
      .intercept({
        path: `/api/v1/data`,
        method: 'GET',
      })
      .reply(() => ({
        data: mockWaterMeterDataResponse,
        statusCode: 200,
      }));

    const data = await waterMeterApi.getData();

    expect(data).toStrictEqual(mockWaterMeterDataResponse);
  });

  describe('polling.start()', () => {
    it('should start polling the "data" endpoint', async () =>
      new Promise(done => {
        mockApiPool
          .intercept({
            path: `/api/v1/data`,
            method: 'GET',
          })
          .reply(() => ({
            data: mockWaterMeterDataResponse,
            statusCode: 200,
          }));

        waterMeterApi.polling.getData.start();

        waterMeterApi.polling.getData.on('response', response => {
          expect(response).toMatchObject(mockWaterMeterDataResponse);
          done(response);
        });
      }));
  });

  describe('polling.stop()', () => {
    it('should start polling the "data" endpoint', async () =>
      new Promise(done => {
        mockApiPool
          .intercept({
            path: `/api/v1/data`,
            method: 'GET',
          })
          .reply(() => ({
            data: mockWaterMeterDataResponse,
            statusCode: 200,
          }));

        waterMeterApi.polling.getData.start();

        waterMeterApi.polling.getData.on('response', response => {
          expect(response).toMatchObject(mockWaterMeterDataResponse);
          done(response);
        });
      }));

    it('should stop polling the "data" endpoint', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/data`,
          method: 'GET',
        })
        .reply(() => ({
          data: mockWaterMeterDataResponse,
          statusCode: 200,
        }));

      const stopPollingSpy = vi.fn();

      waterMeterApi['stopPolling'] = stopPollingSpy;
      waterMeterApi.polling.getData.start();
      waterMeterApi.polling.getData.stop();

      expect(stopPollingSpy).toHaveBeenCalledOnce();
      expect(stopPollingSpy).toHaveBeenCalledWith('getData');
    });
  });
});
