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
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50l3']);

      const expected = {
        meterType: 'SK5\\2M550T-1012',
        version: '50',
        timestamp: '2022-12-15T22:22:25.000Z',
        equipmentId: '4530303434303037303138303138313137',
        textMessage: {
          codes: null,
          message: '',
        },
        power: {
          import: {
            t1: {
              value: 19037.267,
              unit: 'kWh',
            },
            t2: {
              value: 19495.788,
              unit: 'kWh',
            },
            active: {
              value: 0.211,
              unit: 'kW',
            },
          },
          export: {
            t1: {
              value: 0.002,
              unit: 'kWh',
            },
            t2: {
              value: 0.007,
              unit: 'kWh',
            },
            active: {
              value: 0,
              unit: 'kW',
            },
          },
          tariffIndicator: 2,
          threshold: {
            value: null,
            unit: null,
          },
          fuseThreshold: {
            value: null,
            unit: null,
          },
          switchPosition: null,
          numberOfPowerFailures: 7,
          numberOfLongPowerFailures: 4,
          longPowerFailureLog: {
            count: 1,
            log: [
              {
                startOfFailure: '2017-11-30T18:14:43.000Z',
                endOfFailure: '2017-11-30T18:30:27.000Z',
                duration: 944,
                unit: 's',
              },
            ],
          },
          voltageSags: {
            l1: 8,
            l2: 7,
            l3: 11,
          },
          voltageSwell: {
            l1: 1,
            l2: 9,
            l3: 9,
          },
          instantaneous: {
            current: {
              l1: {
                value: 0,
                unit: 'A',
              },
              l2: {
                value: 0,
                unit: 'A',
              },
              l3: {
                value: 0,
                unit: 'A',
              },
            },
            voltage: {
              l1: {
                value: 223,
                unit: 'V',
              },
              l2: {
                value: 222,
                unit: 'V',
              },
              l3: {
                value: 223,
                unit: 'V',
              },
            },
            power: {
              positive: {
                l1: {
                  value: 0.066,
                  unit: 'kW',
                },
                l2: {
                  value: 0.012,
                  unit: 'kW',
                },
                l3: {
                  value: 0.135,
                  unit: 'kW',
                },
              },
              negative: {
                l1: {
                  value: 0,
                  unit: 'kW',
                },
                l2: {
                  value: 0,
                  unit: 'kW',
                },
                l3: {
                  value: 0,
                  unit: 'kW',
                },
              },
            },
          },
        },
        gas: {
          deviceType: '003',
          equipmentId: '4730303332353635353330393732333137',
          timestamp: '2022-12-15T22:20:09.000Z',
          value: 6770.798,
          unit: 'm3',
          valvePosition: null,
        },
      };

      expect(parsedTelegram).toMatchObject(expected);
    });
  });
});
