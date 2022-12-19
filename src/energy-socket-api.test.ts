import { mockBasicInformationResponse } from '@/mocks/data/basic';
import { mockStateResponse } from '@/mocks/data/state';
import { mockIdentifyResponse } from '@/mocks/data/identify';
import { mockApiPool, mockApiUrl } from '@/mocks/api';
import { StateResponse, SystemPutParams } from '@/types';
import { mockEnergySocketDataResponse } from '@/mocks/data/data';
import { mockSystemResponse } from '@/mocks/data/system';
import { EnergySocketApi } from '@/energy-socket-api';

let energySocketApi: EnergySocketApi;

const mockBasicResponse = mockBasicInformationResponse['HWE-SKT'];

describe('EnergySocketApi', () => {
  beforeEach(() => {
    energySocketApi = new EnergySocketApi(mockApiUrl);
  });

  it('should be able to create a new instance', () => {
    expect(energySocketApi).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();

    const energySocketApiWithLogger = new EnergySocketApi(mockApiUrl, {
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

    await energySocketApiWithLogger.getBasicInformation();

    expect(energySocketApiWithLogger).toBeTruthy();
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

    const basicInformation = await energySocketApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
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

    const responseFn = () => energySocketApi.getBasicInformation();

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

    const state = await energySocketApi.getState();

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

    const responseFn = () => energySocketApi.getState();

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

    const state = await energySocketApi.updateState({
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
      energySocketApi.updateState({
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

    const state = await energySocketApi.getSystem();

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

    const responseFn = () => energySocketApi.getSystem();

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

    const system = await energySocketApi.updateSystem({
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
      energySocketApi.updateSystem({
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

    const identify = await energySocketApi.identify();

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

    const responseFn = () => energySocketApi.identify();

    expect(responseFn()).rejects.toThrowError(
      'Api PUT call at http://localhost/api/v1/identify failed with status 500 and response data: Server error!',
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

    const data = await energySocketApi.getData();

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

    const dataFn = () => energySocketApi.getData();

    expect(dataFn()).rejects.toThrowError(
      'Api GET call at http://localhost/api/v1/data failed with status 500 and response data: Server error!',
    );
  });
});
