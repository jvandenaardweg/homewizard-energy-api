import { mockTelegramResponse } from '@/mocks/data/telegram';
import { parseTelegram } from './telegram';

describe('utils/telegram', () => {
  //   describe('parseTelegram', () => {
  //     it('should parse a telegram', () => {
  //       try {
  //         const parsed = parseTelegram(mockTelegramResponse['v42']);
  //         expect(parsed).toMatchObject('');
  //       } catch (err) {
  //         console.log('err while parsing', err);
  //         expect(err).toBeUndefined();
  //       }
  //     });
  //   });
  describe('parsePacket', () => {
    it('should parse a telegram', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50l3_1']);

      const expected = {
        meterType: 'SK5\\2M550T-1012',
        version: '50',
        timestamp: '2019-12-29T23:37:14.000Z',
        equipmentId: '4530303434303037313138353239333138',
        textMessage: { codes: null, message: '' },
        power: {
          import: {
            t1: { value: 4000.647, unit: 'kWh' },
            t2: { value: 1154.948, unit: 'kWh' },
            active: { value: 1.765, unit: 'kW' },
          },
          export: {
            t1: { value: 0, unit: 'kWh' },
            t2: { value: 0, unit: 'kWh' },
            active: { value: 0, unit: 'kW' },
          },
          tariffIndicator: 1,
          threshold: { value: null, unit: null },
          fuseThreshold: { value: null, unit: null },
          switchPosition: null,
          numberOfPowerFailures: 9,
          numberOfLongPowerFailures: 4,
          longPowerFailureLog: {
            count: 2,
            log: [
              {
                startOfFailure: '2018-03-27T06:38:11.000Z',
                endOfFailure: '2018-03-27T06:41:11.000Z',
                duration: 180,
                unit: 's',
              },
              {
                startOfFailure: '2019-01-08T10:16:00.000Z',
                endOfFailure: '2019-01-08T10:59:23.000Z',
                duration: 2603,
                unit: 's',
              },
            ],
          },
          voltageSags: { l1: 1, l2: 1, l3: 1 },
          voltageSwell: { l1: 1, l2: 1, l3: 1 },
          instantaneous: {
            current: {
              l1: { value: 0, unit: 'A' },
              l2: { value: 0, unit: 'A' },
              l3: { value: 6, unit: 'A' },
            },
            voltage: {
              l1: { value: 236, unit: 'V' },
              l2: { value: 235, unit: 'V' },
              l3: { value: 234, unit: 'V' },
            },
            power: {
              positive: {
                l1: { value: 0.132, unit: 'kW' },
                l2: { value: 0.037, unit: 'kW' },
                l3: { value: 1.596, unit: 'kW' },
              },
              negative: {
                l1: { value: 0, unit: 'kW' },
                l2: { value: 0, unit: 'kW' },
                l3: { value: 0, unit: 'kW' },
              },
            },
          },
        },
        gas: {
          deviceType: null,
          equipmentId: null,
          timestamp: null,
          value: null,
          unit: null,
          valvePosition: null,
        },
      };

      expect(parsedTelegram).toMatchObject(expected);
    });
  });
});
