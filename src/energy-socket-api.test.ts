import { mockBasicInformationResponse } from '@/mocks/data/basic';
import { mockStateResponse } from '@/mocks/data/state';
import { mockIdentifyResponse } from '@/mocks/data/identify';
import { apiMocks, mockApiUrl } from '@/mocks/api';
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

    apiMocks.getBasicInformation({
      response: mockBasicResponse,
    });

    await energySocketApiWithLogger.getBasicInformation();

    expect(energySocketApiWithLogger).toBeTruthy();
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should GET the "basic" endpoint', async () => {
    apiMocks.getBasicInformation({
      response: mockBasicResponse,
    });

    const basicInformation = await energySocketApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
  });

  it('should throw an error when GET the "basic" endpoint returns a server error', async () => {
    apiMocks.getBasicInformation({
      response: 'Server error!',
      statusCode: 500,
    });

    const responseFn = () => energySocketApi.getBasicInformation();

    expect(responseFn()).rejects.toThrowError(
      'Api GET call at http://localhost/api failed with status 500 and response data: Server error!',
    );
  });

  it('should GET the "state" endpoint', async () => {
    apiMocks.getState({
      response: mockStateResponse,
    });

    const state = await energySocketApi.getState();

    expect(state).toStrictEqual(mockStateResponse);
  });

  it('should throw an error when GET the "state" endpoint returns a server error', async () => {
    apiMocks.getState({
      response: 'Server error!',
      statusCode: 500,
    });

    const responseFn = () => energySocketApi.getState();

    expect(responseFn()).rejects.toThrowError(
      'Api GET call at http://localhost/api/v1/state failed with status 500 and response data: Server error!',
    );
  });

  it('should PUT the "state" endpoint', async () => {
    const updatedPowerOn = true;

    const mockedResponse = {
      power_on: updatedPowerOn,
    };

    apiMocks.updateState({
      response: mockedResponse,
    });

    const state = await energySocketApi.updateState({
      power_on: updatedPowerOn,
    });

    expect(state).toMatchObject(mockedResponse);
  });

  it('should throw an error on PUT when the "state" endpoint returns a server error', async () => {
    apiMocks.updateState({
      response: 'Server error!',
      statusCode: 500,
    });

    const responseFn = () =>
      energySocketApi.updateState({
        power_on: true,
      });

    expect(responseFn()).rejects.toThrowError(
      'Api PUT call at http://localhost/api/v1/state failed with status 500 and response data: Server error!',
    );
  });

  it('should GET the "system" endpoint', async () => {
    apiMocks.getSystem({
      response: mockSystemResponse,
    });

    const state = await energySocketApi.getSystem();

    expect(state).toStrictEqual(mockSystemResponse);
  });

  it('should throw an error when GET the "system" endpoint returns a server error', async () => {
    apiMocks.getSystem({
      response: 'Server error!',
      statusCode: 500,
    });

    const responseFn = () => energySocketApi.getSystem();

    expect(responseFn()).rejects.toThrowError(
      'Api GET call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
    );
  });

  it('should PUT the "system" endpoint', async () => {
    const updatedCloudEnabled = false;

    apiMocks.updateSystem({
      response: {
        cloud_enabled: updatedCloudEnabled,
      },
    });

    const system = await energySocketApi.updateSystem({
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
      energySocketApi.updateSystem({
        cloud_enabled: true,
      });

    expect(responseFn()).rejects.toThrowError(
      'Api PUT call at http://localhost/api/v1/system failed with status 500 and response data: Server error!',
    );
  });

  it('should PUT the "identify" endpoint', async () => {
    apiMocks.identify({
      response: mockIdentifyResponse,
    });

    const identify = await energySocketApi.identify();

    expect(identify).toStrictEqual(mockIdentifyResponse);
  });

  it('should throw an error when PUT on the "identify" endpoint returns a server error', async () => {
    apiMocks.identify({
      response: 'Server error!',
      statusCode: 500,
    });

    const responseFn = () => energySocketApi.identify();

    expect(responseFn()).rejects.toThrowError(
      'Api PUT call at http://localhost/api/v1/identify failed with status 500 and response data: Server error!',
    );
  });

  it('should GET the "data" endpoint as an Energy Socket', async () => {
    apiMocks.getData({
      response: mockEnergySocketDataResponse,
    });

    const data = await energySocketApi.getData();

    expect(data).toStrictEqual(mockEnergySocketDataResponse);
  });

  it('should throw an error when GET on the "data" endpoint returns a server error', async () => {
    apiMocks.getData({
      response: 'Server error!',
      statusCode: 500,
    });

    const dataFn = () => energySocketApi.getData();

    expect(dataFn()).rejects.toThrowError(
      'Api GET call at http://localhost/api/v1/data failed with status 500 and response data: Server error!',
    );
  });
});
