import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { apiMocks, mockApiUrl } from '@/mocks/api';
import { mockKwhMeter3PhaseResponse } from '@/mocks/data/data';
import { KwhMeter3PhaseApi } from '@/kwh-meter-3-phase-api';
import { mockSystemResponse } from './mocks/data/system';

let kwhMeter3PhaseApi: KwhMeter3PhaseApi;

const mockBasicResponse = mockBasicInformationResponse['SDM630-wifi'];

describe('WaterMeterApi', () => {
  beforeEach(() => {
    kwhMeter3PhaseApi = new KwhMeter3PhaseApi(mockApiUrl);
  });

  it('should be able to create a new instance', () => {
    expect(kwhMeter3PhaseApi).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();

    const kwhMeter1PhaseApiWithLogger = new KwhMeter3PhaseApi(mockApiUrl, {
      logger: {
        method: loggerSpy,
      },
    });

    apiMocks.getBasicInformation({
      response: mockBasicResponse,
    });

    await kwhMeter1PhaseApiWithLogger.getBasicInformation();

    expect(kwhMeter1PhaseApiWithLogger).toBeTruthy();
    expect(loggerSpy).toHaveBeenCalled();
  });

  describe('getBasicInformation()', () => {
    it('should GET the "basic" endpoint', async () => {
      apiMocks.getBasicInformation({
        response: mockBasicResponse,
      });

      const basicInformation = await kwhMeter3PhaseApi.getBasicInformation();

      expect(basicInformation).toStrictEqual(mockBasicResponse);
    });
  });

  describe('getData()', () => {
    it('should GET the "data" endpoint', async () => {
      apiMocks.getData({
        response: mockKwhMeter3PhaseResponse,
      });

      const data = await kwhMeter3PhaseApi.getData();

      expect(data).toStrictEqual(mockKwhMeter3PhaseResponse);
    });
  });

  describe('polling.getData()', () => {
    it('should start polling getData when start() is invoked', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: mockKwhMeter3PhaseResponse,
        });

        kwhMeter3PhaseApi.polling.getData.start();

        kwhMeter3PhaseApi.polling.getData.on('response', response => {
          expect(response).toStrictEqual(mockKwhMeter3PhaseResponse);
          done(mockKwhMeter3PhaseResponse);
        });
      }));
  });

  describe('getSystem', () => {
    it('should GET the "system" endpoint', async () => {
      apiMocks.getSystem({
        response: mockSystemResponse,
      });

      const state = await kwhMeter3PhaseApi.getSystem();

      expect(state).toStrictEqual(mockSystemResponse);
    });

    it('should throw an error when GET the "system" endpoint returns a server error', async () => {
      apiMocks.getSystem({
        response: 'Server error!',
        statusCode: 500,
      });

      const responseFn = () => kwhMeter3PhaseApi.getSystem();

      expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('updateSystem', () => {
    it('should PUT the "system" endpoint', async () => {
      const updatedCloudEnabled = false;

      apiMocks.updateSystem({
        response: {
          cloud_enabled: updatedCloudEnabled,
        },
      });

      const system = await kwhMeter3PhaseApi.updateSystem({
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
        kwhMeter3PhaseApi.updateSystem({
          cloud_enabled: true,
        });

      expect(responseFn()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
      );
    });
  });
});
