import { mockBasicInformationResponse } from '@/mocks/data/basic';
import { mockStateResponse } from '@/mocks/data/state';
import { mockIdentifyResponse } from '@/mocks/data/identify';
import { apiMocks, HTML_HEADERS, mockApiUrl } from '@/mocks/api';
import { HomeWizardEnergyApiResponseError } from '@/base-api';
import { mockEnergySocket21DataResponse, mockEnergySocketDataResponse } from '@/mocks/data/data';
import { mockSystemResponse } from '@/mocks/data/system';
import { EnergySocketApi } from '@/energy-socket-api';
import { mockErrorMethodNotAllowed, mockErrorSwitchLockEnabled } from '@/mocks/errors';

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

  describe('getBasicInformation()', () => {
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

      await expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('getState()', () => {
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

      await expect(responseFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/state failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('updateState()', () => {
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

      await expect(responseFn()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/state failed with status 500 and response data: Server error!',
      );
    });

    it('should expose the parsed API error when PUT on the "state" endpoint returns an error object', async () => {
      apiMocks.updateState({
        response: mockErrorSwitchLockEnabled,
        statusCode: 400,
      });

      await expect(energySocketApi.updateState({ power_on: false })).rejects.toMatchObject({
        statusCode: 400,
        apiError: mockErrorSwitchLockEnabled.error,
      });
    });
  });

  describe('getSystem', () => {
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

      const identify = await energySocketApi.identify();

      expect(identify).toStrictEqual(mockIdentifyResponse);
    });

    it('should throw an error when PUT on the "identify" endpoint returns a server error', async () => {
      apiMocks.identify({
        response: 'Server error!',
        statusCode: 500,
      });

      const responseFn = () => energySocketApi.identify();

      await expect(responseFn()).rejects.toThrowError(
        'Api PUT call at http://localhost/api/v1/identify failed with status 500 and response data: Server error!',
      );
    });

    it('should throw an error with the plain-text body when the method is not allowed', async () => {
      apiMocks.identify({
        response: mockErrorMethodNotAllowed,
        statusCode: 405,
        headers: HTML_HEADERS,
      });

      const error = await energySocketApi.identify().catch(error => error);

      expect(error).toBeInstanceOf(HomeWizardEnergyApiResponseError);
      expect(error).toMatchObject({
        statusCode: 405,
        response: mockErrorMethodNotAllowed,
        apiError: undefined,
      });
    });
  });

  describe('getData()', () => {
    it('should GET the "data" endpoint as an Energy Socket', async () => {
      apiMocks.getData({
        response: mockEnergySocketDataResponse,
      });

      const data = await energySocketApi.getData();

      expect(data).toStrictEqual(mockEnergySocketDataResponse);
    });

    it('should GET the "data" endpoint as an Energy Socket HWE-SKT-21', async () => {
      apiMocks.getData({
        response: mockEnergySocket21DataResponse,
      });

      const data = await energySocketApi.getData();

      expect(data).toStrictEqual(mockEnergySocket21DataResponse);
    });

    it('should throw an error when GET on the "data" endpoint returns a server error', async () => {
      apiMocks.getData({
        response: 'Server error!',
        statusCode: 500,
      });

      const dataFn = () => energySocketApi.getData();

      await expect(dataFn()).rejects.toThrowError(
        'Api GET call at http://localhost/api/v1/data failed with status 500 and response data: Server error!',
      );
    });
  });

  describe('polling', () => {
    it('should emit the "data" response to polling.getData listeners', async () =>
      new Promise(done => {
        apiMocks.getData({
          response: mockEnergySocketDataResponse,
        });

        energySocketApi.polling.getData.on('response', response => {
          energySocketApi.polling.getData.stop();

          expect(response).toStrictEqual(mockEnergySocketDataResponse);
          done(true);
        });

        energySocketApi.polling.getData.start();
      }));

    it('should emit the "state" response to polling.getState listeners', async () =>
      new Promise(done => {
        apiMocks.getState({
          response: mockStateResponse,
        });

        energySocketApi.polling.getState.on('response', response => {
          energySocketApi.polling.getState.stop();

          expect(response).toStrictEqual(mockStateResponse);
          done(true);
        });

        energySocketApi.polling.getState.start();
      }));

    it('should stop polling getState when stop() is invoked', () => {
      energySocketApi['isPolling']['getState'] = true;

      energySocketApi.polling.getState.stop();

      expect(energySocketApi['isPolling']['getState']).toBe(false);
    });
  });
});
