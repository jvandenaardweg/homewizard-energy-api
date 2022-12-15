import { HomeWizardEnergyApi } from './api';
import { mockBasicInformationResponse } from './mocks/data/basic';
import { mockStateResponse } from './mocks/data/state';
import { mockIdentifyResponse } from './mocks/data/identify';
import { mockApiUrl } from './mocks/api';
import { Interceptable, MockAgent, setGlobalDispatcher } from 'undici';
import { StateResponse, SystemPutParams } from './types';
import { mockEnergySocketDataResponse, mockP1MeterDataResponse } from './mocks/data/data';
import { HomeWizardEnergyApiError, HomeWizardEnergyApiResponseError } from './base';
import { mockTelegramResponse } from './mocks/data/telegram';
import { mockSystemResponse } from './mocks/data/system';

let mockApiAgent: MockAgent;
let mockApiPool: Interceptable;
let homeWizardEnergyApi: HomeWizardEnergyApi;

describe('HomeWizardEnergyApi', () => {
  beforeEach(() => {
    homeWizardEnergyApi = new HomeWizardEnergyApi(mockApiUrl);

    mockApiAgent = new MockAgent({
      bodyTimeout: 10,
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10,
    });

    mockApiAgent.disableNetConnect();

    setGlobalDispatcher(mockApiAgent);

    mockApiPool = mockApiAgent.get(mockApiUrl);
  });

  afterEach(async () => {
    await mockApiAgent.close();
  });

  it('should be able to create a new instance', () => {
    expect(homeWizardEnergyApi).toBeTruthy();
  });

  it('should throw an error when GET on the "data" endpoint returns a server error for p1 meter', async () => {
    mockApiPool
      .intercept({
        path: `/api/v1/data`,
        method: 'GET',
      })
      .reply(() => ({
        data: 'Server error!',
        statusCode: 500,
      }));

    const dataFn = () => homeWizardEnergyApi.p1Meter.getData();

    expect(dataFn()).rejects.toThrowError(
      'Api GET call at http://localhost/api/v1/data failed with status 500 and response data: Server error!',
    );
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

  describe('EnergySocket', () => {
    it('should GET the "basic" endpoint', async () => {
      mockApiPool
        .intercept({
          path: '/api',
          method: 'GET',
        })
        .reply(() => ({
          data: mockBasicInformationResponse,
          statusCode: 200,
        }));

      const basicInformation = await homeWizardEnergyApi.energySocket.getBasicInformation();

      expect(basicInformation).toStrictEqual(mockBasicInformationResponse);
    });

    it('should throw an error when GET the "basic" endpoint returns a server error', async () => {
      mockApiPool
        .intercept({
          path: '/api',
          method: 'GET',
        })
        .reply(() => ({
          data: 'Server error!',
          statusCode: 500,
        }));

      const responseFn = () => homeWizardEnergyApi.energySocket.getBasicInformation();

      expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api failed with status 500 and response data: Server error!',
      );
    });

    it('should GET the "state" endpoint', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/state`,
          method: 'GET',
        })
        .reply(() => ({
          data: mockStateResponse,
          statusCode: 200,
        }));

      const state = await homeWizardEnergyApi.energySocket.getState();

      expect(state).toStrictEqual(mockStateResponse);
    });

    it('should throw an error when GET the "state" endpoint returns a server error', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/state`,
          method: 'GET',
        })
        .reply(() => ({
          data: 'Server error!',
          statusCode: 500,
        }));

      const responseFn = () => homeWizardEnergyApi.energySocket.getState();

      expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/state failed with status 500 and response data: Server error!',
      );
    });

    it('should PUT the "state" endpoint', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/state`,
          method: 'PUT',
        })
        .reply(({ body }) => {
          if (!body) {
            return {
              statusCode: 400,
            };
          }

          const bodyParams = JSON.parse(body.toString()) as Partial<StateResponse>;

          const updatedStateResponse = {
            ...mockStateResponse,
            ...bodyParams,
          };

          return {
            data: updatedStateResponse,
            statusCode: 200,
          };
        });

      const updatedPowerOn = true;

      const state = await homeWizardEnergyApi.energySocket.putState({
        power_on: updatedPowerOn,
      });

      expect(state.power_on).toBe(updatedPowerOn);
    });

    it('should throw an error on PUT when the "state" endpoint returns a server error', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/state`,
          method: 'PUT',
        })
        .reply(() => ({
          data: 'Server error!',
          statusCode: 500,
        }));

      const responseFn = () =>
        homeWizardEnergyApi.energySocket.putState({
          power_on: true,
        });

      expect(responseFn()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/state failed with status 500 and response data: Server error!',
      );
    });

    it('should GET the "system" endpoint', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/system`,
          method: 'GET',
        })
        .reply(() => ({
          data: mockSystemResponse,
          statusCode: 200,
        }));

      const state = await homeWizardEnergyApi.energySocket.getSystem();

      expect(state).toStrictEqual(mockSystemResponse);
    });

    it('should throw an error when GET the "system" endpoint returns a server error', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/system`,
          method: 'GET',
        })
        .reply(() => ({
          data: 'Server error!',
          statusCode: 500,
        }));

      const responseFn = () => homeWizardEnergyApi.energySocket.getSystem();

      expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
      );
    });

    it('should PUT the "system" endpoint', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/system`,
          method: 'PUT',
        })
        .reply(({ body }) => {
          if (!body) {
            return {
              statusCode: 400,
            };
          }

          const bodyParams = JSON.parse(body.toString()) as Partial<SystemPutParams>;

          const updatedSystemResponse = {
            ...mockSystemResponse,
            ...bodyParams,
          };

          return {
            data: updatedSystemResponse,
            statusCode: 200,
          };
        });

      const updatedCloudEnabled = false;

      const system = await homeWizardEnergyApi.energySocket.putSystem({
        cloud_enabled: updatedCloudEnabled,
      });

      expect(system.cloud_enabled).toBe(updatedCloudEnabled);
    });

    it('should throw an error on PUT when the "system" endpoint returns a server error', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/system`,
          method: 'PUT',
        })
        .reply(() => ({
          data: 'Server error!',
          statusCode: 500,
        }));

      const responseFn = () =>
        homeWizardEnergyApi.energySocket.putSystem({
          cloud_enabled: true,
        });

      expect(responseFn()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
      );
    });

    it('should PUT the "identify" endpoint', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/identify`,
          method: 'PUT',
        })
        .reply(() => ({
          data: mockIdentifyResponse,
          statusCode: 200,
        }));

      const firmwareVersion = 3;

      const identify = await homeWizardEnergyApi.energySocket.putIdentify(firmwareVersion);

      expect(identify).toStrictEqual(mockIdentifyResponse);
    });

    it('should throw an error when PUT on the "identify" endpoint returns a server error', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/identify`,
          method: 'PUT',
        })
        .reply(() => ({
          data: 'Server error!',
          statusCode: 500,
        }));

      const responseFn = () => homeWizardEnergyApi.energySocket.putIdentify(3);

      expect(responseFn()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/identify failed with status 500 and response data: Server error!',
      );
    });

    it('should error when firmware version on PUT "identify" endpoint is too low', async () => {
      const firmwareVersion = 2;

      const identifyFn = async () => homeWizardEnergyApi.energySocket.putIdentify(firmwareVersion);

      expect(identifyFn()).rejects.toThrow(
        'Cannot identify this Energy Socket. Firmware version is 2. But the identify feature is only available on Energy Sockets with firmware version 3.00 or later.',
      );
    });

    it('should error when firmware version on PUT "identify" endpoint is null', async () => {
      const firmwareVersion = null;

      const identifyFn = async () => homeWizardEnergyApi.energySocket.putIdentify(firmwareVersion);

      expect(identifyFn()).rejects.toThrow(
        'Cannot identify this Energy Socket. The firmware version is not set.',
      );
    });

    it('should error when firmware version on PUT "identify" endpoint is 0', async () => {
      const firmwareVersion = 0;

      const identifyFn = async () => homeWizardEnergyApi.energySocket.putIdentify(firmwareVersion);

      expect(identifyFn()).rejects.toThrow(
        'Cannot identify this Energy Socket. The firmware version is not set.',
      );
    });

    it('should GET the "data" endpoint as an Energy Socket', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/data`,
          method: 'GET',
        })
        .reply(() => ({
          data: mockEnergySocketDataResponse,
          statusCode: 200,
        }));

      const data = await homeWizardEnergyApi.energySocket.getData();

      expect(data).toStrictEqual(mockEnergySocketDataResponse);
    });

    it('should throw an error when GET on the "data" endpoint returns a server error', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/data`,
          method: 'GET',
        })
        .reply(() => ({
          data: 'Server error!',
          statusCode: 500,
        }));

      const dataFn = () => homeWizardEnergyApi.energySocket.getData();

      expect(dataFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/data failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('P1Meter', () => {
    it('should GET the "basic" endpoint', async () => {
      mockApiPool
        .intercept({
          path: '/api',
          method: 'GET',
        })
        .reply(() => ({
          data: mockBasicInformationResponse,
          statusCode: 200,
        }));

      const basicInformation = await homeWizardEnergyApi.p1Meter.getBasicInformation();

      expect(basicInformation).toStrictEqual(mockBasicInformationResponse);
    });

    it('should GET the "data" endpoint', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/data`,
          method: 'GET',
        })
        .reply(() => ({
          data: mockP1MeterDataResponse,
          statusCode: 200,
        }));

      const data = await homeWizardEnergyApi.p1Meter.getData();

      expect(data).toStrictEqual(mockP1MeterDataResponse);
    });

    it('should GET the "telegram" endpoint', async () => {
      mockApiPool
        .intercept({
          path: `/api/v1/telegram`,
          method: 'GET',
        })
        .reply(() => ({
          data: mockTelegramResponse,
          statusCode: 200,
        }));

      const data = await homeWizardEnergyApi.p1Meter.getTelegram();

      expect(data).toStrictEqual(mockTelegramResponse);
    });
  });
});
