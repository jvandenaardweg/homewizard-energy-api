import { mockApiUrl } from '@/mocks/api';
import { apiV2Mocks, mockedRequestsV2, mockTokenV2 } from '@/mocks/api-v2';
import {
  mockBasicInformationV2Response,
  mockPlugInBatteryMeasurementResponse,
  mockSystemV2Response,
} from '@/mocks/data/v2';
import { EnergySocketApiV2 } from '@/energy-socket-api-v2';

let api: EnergySocketApiV2;

describe('EnergySocketApiV2', () => {
  beforeEach(() => {
    mockedRequestsV2.length = 0;
    api = new EnergySocketApiV2(mockApiUrl, { api: { token: mockTokenV2 } });
  });

  it('should be able to create a new instance', () => {
    expect(api).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();
    const apiWithLogger = new EnergySocketApiV2(mockApiUrl, { logger: { method: loggerSpy } });

    apiV2Mocks.getBasicInformation({ response: mockBasicInformationV2Response });

    await apiWithLogger.getBasicInformation();

    expect(loggerSpy).toHaveBeenCalled();
  });

  describe('getBasicInformation()', () => {
    it('should GET the "basic" endpoint', async () => {
      apiV2Mocks.getBasicInformation({ response: mockBasicInformationV2Response });

      expect(await api.getBasicInformation()).toStrictEqual(mockBasicInformationV2Response);
    });
  });

  describe('getData()', () => {
    it('should GET the "measurement" endpoint', async () => {
      apiV2Mocks.getData({ response: mockPlugInBatteryMeasurementResponse });

      expect(await api.getData()).toStrictEqual(mockPlugInBatteryMeasurementResponse);
      expect(mockedRequestsV2[0].path).toBe('/api/measurement');
    });
  });

  describe('polling.getData', () => {
    it('should start polling getData when start() is invoked', async () =>
      new Promise(done => {
        apiV2Mocks.getData({ response: mockPlugInBatteryMeasurementResponse });

        api.polling.getData.start();

        api.polling.getData.on('response', response => {
          expect(response).toStrictEqual(mockPlugInBatteryMeasurementResponse);
          api.polling.getData.stop();
          done(response);
        });
      }));
  });

  describe('getSystem() / updateSystem()', () => {
    it('should GET the "system" endpoint', async () => {
      apiV2Mocks.getSystem({ response: mockSystemV2Response });

      expect(await api.getSystem()).toStrictEqual(mockSystemV2Response);
    });

    it('should PUT the "system" endpoint', async () => {
      apiV2Mocks.updateSystem({
        response: { ...mockSystemV2Response, status_led_brightness_pct: 10 },
      });

      const system = await api.updateSystem({ status_led_brightness_pct: 10 });

      expect(system.status_led_brightness_pct).toBe(10);
    });
  });

  describe('identify()', () => {
    it('should PUT the "identify" endpoint', async () => {
      apiV2Mocks.identify();

      await expect(api.identify()).resolves.toBeUndefined();
    });
  });
});
