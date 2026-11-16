import { mockApiUrl } from '@/mocks/api';
import { apiV2Mocks, mockedRequestsV2, mockTokenV2 } from '@/mocks/api-v2';
import {
  mockBasicInformationV2Response,
  mockBatteriesResponse,
  mockP1MeterMeasurementResponse,
  mockSystemV2Response,
} from '@/mocks/data/v2';
import { mockParsedTelegramResponse, mockTelegramResponse } from '@/mocks/data/telegram';
import { P1MeterApiV2 } from '@/p1-meter-api-v2';

const mockTelegramResponseV50 = mockTelegramResponse['v50l3_2'];
const mockParsedTelegramResponseV50 = mockParsedTelegramResponse['v50l3_2'];

let api: P1MeterApiV2;

describe('P1MeterApiV2', () => {
  beforeEach(() => {
    mockedRequestsV2.length = 0;
    api = new P1MeterApiV2(mockApiUrl, { api: { token: mockTokenV2 } });
  });

  it('should be able to create a new instance', () => {
    expect(api).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();
    const apiWithLogger = new P1MeterApiV2(mockApiUrl, { logger: { method: loggerSpy } });

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
      apiV2Mocks.getData({ response: mockP1MeterMeasurementResponse });

      expect(await api.getData()).toStrictEqual(mockP1MeterMeasurementResponse);
      expect(mockedRequestsV2[0].path).toBe('/api/measurement');
    });
  });

  describe('polling.getData', () => {
    it('should start polling getData when start() is invoked', async () =>
      new Promise(done => {
        apiV2Mocks.getData({ response: mockP1MeterMeasurementResponse });

        api.polling.getData.start();

        api.polling.getData.on('response', response => {
          expect(response).toStrictEqual(mockP1MeterMeasurementResponse);
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

  describe('reboot()', () => {
    it('should PUT the "reboot" endpoint', async () => {
      apiV2Mocks.reboot();

      await expect(api.reboot()).resolves.toBeUndefined();
    });
  });

  describe('getBatteries() / updateBatteries()', () => {
    it('should GET the "batteries" endpoint', async () => {
      apiV2Mocks.getBatteries({ response: mockBatteriesResponse });

      expect(await api.getBatteries()).toStrictEqual(mockBatteriesResponse);
    });

    it('should PUT the "batteries" endpoint', async () => {
      apiV2Mocks.updateBatteries({ response: { ...mockBatteriesResponse, mode: 'standby' } });

      const batteries = await api.updateBatteries({ mode: 'standby' });

      expect(batteries.mode).toBe('standby');
      expect(mockedRequestsV2[0].body).toStrictEqual({ mode: 'standby' });
    });
  });

  describe('polling.getBatteries', () => {
    it('should start polling getBatteries when start() is invoked', async () =>
      new Promise(done => {
        apiV2Mocks.getBatteries({ response: mockBatteriesResponse });

        api.polling.getBatteries.start();

        api.polling.getBatteries.on('response', response => {
          expect(response).toStrictEqual(mockBatteriesResponse);
          api.polling.getBatteries.stop();
          done(response);
        });
      }));
  });

  describe('getTelegram() / getParsedTelegram()', () => {
    it('should GET the "telegram" endpoint', async () => {
      apiV2Mocks.getTelegram({ response: mockTelegramResponseV50 });

      expect(await api.getTelegram()).toBe(mockTelegramResponseV50);
    });

    it('should return the parsed telegram', async () => {
      apiV2Mocks.getTelegram({ response: mockTelegramResponseV50 });

      expect(await api.getParsedTelegram()).toStrictEqual(mockParsedTelegramResponseV50);
    });
  });

  describe('polling.getTelegram / polling.getParsedTelegram', () => {
    it('should start polling getTelegram when start() is invoked', async () =>
      new Promise(done => {
        apiV2Mocks.getTelegram({ response: mockTelegramResponseV50 });

        api.polling.getTelegram.start();

        api.polling.getTelegram.on('response', response => {
          expect(response).toBe(mockTelegramResponseV50);
          api.polling.getTelegram.stop();
          done(response);
        });
      }));

    it('should start polling getParsedTelegram when start() is invoked', async () =>
      new Promise(done => {
        apiV2Mocks.getTelegram({ response: mockTelegramResponseV50 });

        api.polling.getParsedTelegram.start();

        api.polling.getParsedTelegram.on('response', response => {
          expect(response).toStrictEqual(mockParsedTelegramResponseV50);
          api.polling.getParsedTelegram.stop();
          done(response);
        });
      }));
  });
});
