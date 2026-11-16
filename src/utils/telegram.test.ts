import { mockParsedTelegramResponse, mockTelegramResponse } from '@/mocks/data/telegram';
import {
  convertHexToAscii,
  parseHourlyReading,
  parsePeakDemand,
  parsePeakDemandHistory,
  parseLine,
  parsePowerFailureEventLog,
  parseTelegram,
  parseTimestamp,
  subtractNumberOfSecondsFromDate,
  TelegramPowerFailureLog,
} from './telegram';

describe('utils/telegram', () => {
  describe('parseLine', () => {
    it('should parse a line', () => {
      const parsedLine = parseLine('0-0:1.0.0(221219072214W)');

      const expected = {
        obisCode: '0-0:1.0.0',
        value: '221219072214W',
      };

      expect(parsedLine).toMatchObject(expected);
    });

    it('should parse a line', () => {
      const parsedLine = parseLine('1-0:99.97.0(1)(0-0:96.7.19)(171130183027W)(0000000944*s)');

      const expected = {
        obisCode: '1-0:99.97.0',
        value: '1)(0-0:96.7.19)(171130183027W)(0000000944*s',
      };

      expect(parsedLine).toMatchObject(expected);
    });

    it('should parse a line', () => {
      const parsedLine = parseLine('0-0:96.13.0()');

      const expected = {
        obisCode: '0-0:96.13.0',
        value: '',
      };

      expect(parsedLine).toMatchObject(expected);
    });

    it('should parse a line', () => {
      const parsedLine = parseLine('0-1:24.2.1(221219072008W)(06798.552*m3)');

      const expected = {
        obisCode: '0-1:24.2.1',
        value: '221219072008W)(06798.552*m3',
      };

      expect(parsedLine).toMatchObject(expected);
    });
  });

  describe('parseTimestamp', () => {
    it('should parse a timestamp', () => {
      const parsedTimestamp = parseTimestamp('221219072214W');

      const expected = '2022-12-19T08:22:14+01:00';

      expect(parsedTimestamp).toBe(expected);
    });
    it('should parse a timestamp', () => {
      const parsedTimestamp = parseTimestamp('171130183027W');

      const expected = '2017-11-30T19:30:27+01:00';

      expect(parsedTimestamp).toBe(expected);
    });
    it('should return null if timestamp is an empty string', () => {
      const parsedTimestamp = parseTimestamp('');

      const expected = null;

      expect(parsedTimestamp).toBe(expected);
    });
    it('should return null if timestamp is null', () => {
      const parsedTimestamp = parseTimestamp(null);

      const expected = null;

      expect(parsedTimestamp).toBe(expected);
    });
  });

  describe('parsePowerFailureEventLog', () => {
    it('should parse a power failure event log', () => {
      const parsedPowerFailureEventLog = parsePowerFailureEventLog(
        '1)(0-0:96.7.19)(171130183027W)(0000000944*s',
      );

      const expected = {
        count: 1,
        log: [
          {
            startOfFailure: '2017-11-30T19:14:43+01:00',
            endOfFailure: '2017-11-30T19:30:27+01:00',
            duration: 944,
            unit: 's',
          },
        ],
      } satisfies TelegramPowerFailureLog;

      expect(parsedPowerFailureEventLog).toMatchObject(expected);
    });
    it('should parse a power failure event log', () => {
      const parsedPowerFailureEventLog = parsePowerFailureEventLog(
        '2)(0-0:96.7.19)(180327064111S)(0000000180*s)(190108105923W)(0000002603*s',
      );

      const expected = {
        count: 2,
        log: [
          {
            startOfFailure: '2018-03-27T08:38:11+02:00',
            endOfFailure: '2018-03-27T08:41:11+02:00',
            duration: 180,
            unit: 's',
          },
          {
            startOfFailure: '2019-01-08T11:16:00+01:00',
            endOfFailure: '2019-01-08T11:59:23+01:00',
            duration: 2603,
            unit: 's',
          },
        ],
      } satisfies TelegramPowerFailureLog;

      expect(parsedPowerFailureEventLog).toMatchObject(expected);
    });

    it('should parse a power failure event log', () => {
      const parsedPowerFailureEventLog = parsePowerFailureEventLog(
        '2)(0-0:96.7.19)(180824143702S)(0000005600*s)(000101000001W)(2147483647*s',
      );

      const expected = {
        count: 2,
        log: [
          {
            startOfFailure: '2018-08-24T15:03:42+02:00',
            endOfFailure: '2018-08-24T16:37:02+02:00',
            duration: 5600,
            unit: 's',
          },
          {
            startOfFailure: '1931-12-13T21:45:54Z',
            endOfFailure: '2000-01-01T01:00:01+01:00',
            duration: 2147483647,
            unit: 's',
          },
        ],
      } satisfies TelegramPowerFailureLog;

      expect(parsedPowerFailureEventLog).toMatchObject(expected);
    });
  });

  describe('parseHourlyReading', () => {
    it('should parse a hourly reading', () => {
      const parsedHourlyReading = parseHourlyReading('221219072214W)(06798.552*m3');

      const expected = {
        timestamp: '221219072214W',
        value: '06798.552',
        unit: 'm3',
      };

      expect(parsedHourlyReading).toMatchObject(expected);
    });
    it('should parse a hourly reading', () => {
      const parsedHourlyReading = parseHourlyReading('171130183027W)(0000000944*s');

      const expected = {
        timestamp: '171130183027W',
        value: '0000000944',
        unit: 's',
      };

      expect(parsedHourlyReading).toMatchObject(expected);
    });
  });

  describe('subtractNumberOfSecondsFromDate', () => {
    it('should subtract a number of seconds from a date', () => {
      const subtractedDate = subtractNumberOfSecondsFromDate('2022-12-19T07:22:14+01:00', 944);

      const expected = '2022-12-19T07:06:30+01:00';

      expect(subtractedDate).toBe(expected);
    });
  });

  describe('convertHexToAscii', () => {
    it('should convert a hex string to ascii', () => {
      const ascii = convertHexToAscii('68656c6c6f');

      const expected = 'hello';

      expect(ascii).toBe(expected);
    });
    it('should convert a hex string to ascii', () => {
      const ascii = convertHexToAscii('0x68656c6c6f');

      const expected = 'hello';

      expect(ascii).toBe(expected);
    });
    it('should convert a hex string to ascii', () => {
      const ascii = convertHexToAscii('0x68656c6c6f20776f726c64');

      const expected = 'hello world';

      expect(ascii).toBe(expected);
    });
    it('should convert a hex string to ascii', () => {
      const ascii = convertHexToAscii('20 20 20 20 20 68 65 6c 6c 6f 20 20 20 20 20');

      const expected = '     hello     ';

      expect(ascii).toBe(expected);
    });
  });

  describe('parseTelegram', () => {
    it('should parse a telegram', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50l3_2']);

      // console.log(JSON.stringify(parsedTelegram, null, 2));

      const expected = mockParsedTelegramResponse['v50l3_2'];

      expect(parsedTelegram).toMatchObject(expected);
    });

    // https://github.com/jvandenaardweg/homewizard-energy-api/issues/100
    it('should parse the demand (capacity tariff) of a Belgian telegram', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const parsedTelegram = parseTelegram(mockTelegramResponse['v50beDemand']);

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      expect(parsedTelegram.power.demand.average).toStrictEqual({ value: 0.255, unit: 'kW' });
      expect(parsedTelegram.power.demand.monthlyPeak).toStrictEqual({
        timestamp: '2023-09-03T13:45:00+02:00',
        value: 2.762,
        unit: 'kW',
      });
      expect(parsedTelegram.power.demand.monthlyPeakHistory.count).toBe(3);
      expect(parsedTelegram.power.demand.monthlyPeakHistory.log).toStrictEqual([
        {
          endOfPeriod: '2023-02-01T01:00:00+01:00',
          timestamp: '2023-01-10T18:45:00+01:00',
          value: 4.769,
          unit: 'kW',
        },
        {
          endOfPeriod: '2023-03-01T01:00:00+01:00',
          timestamp: '2023-02-12T19:15:00+01:00',
          value: 5.012,
          unit: 'kW',
        },
        {
          endOfPeriod: '2023-04-01T02:00:00+02:00',
          timestamp: '2023-03-05T13:00:00+01:00',
          value: 3.5,
          unit: 'kW',
        },
      ]);
      // The lines around the demand are still parsed
      expect(parsedTelegram.power.import.active).toStrictEqual({ value: 0.37, unit: 'kW' });
      expect(parsedTelegram.power.tariffIndicator).toBe(1);

      consoleErrorSpy.mockRestore();
    });

    it('should parse the gas reading of a Belgian telegram', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50be']);

      expect(parsedTelegram.gas).toStrictEqual({
        deviceType: '003',
        equipmentId: '37464C4F32313139303331393634',
        timestamp: '2021-03-20T22:46:26+01:00',
        value: 2559.077,
        unit: 'm3',
        valvePosition: '1',
      });
    });

    it('should leave the demand empty when the telegram has none', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50l3_2']);

      expect(parsedTelegram.power.demand).toStrictEqual({
        average: { value: null, unit: null },
        monthlyPeak: { timestamp: null, value: null, unit: null },
        monthlyPeakHistory: { count: null, log: [] },
      });
    });
  });

  describe('parsePeakDemand', () => {
    it('should parse a peak demand', () => {
      expect(parsePeakDemand('230903114500S)(02.762*kW')).toStrictEqual({
        timestamp: '2023-09-03T13:45:00+02:00',
        value: 2.762,
        unit: 'kW',
      });
    });

    it('should return empty values when the peak demand can not be parsed', () => {
      expect(parsePeakDemand('')).toStrictEqual({ timestamp: null, value: null, unit: null });
    });
  });

  describe('parsePeakDemandHistory', () => {
    it('should parse an empty history', () => {
      expect(parsePeakDemandHistory('0)(1-0:1.6.0)(1-0:1.6.0')).toStrictEqual({
        count: 0,
        log: [],
      });
    });

    it('should ignore an incomplete entry', () => {
      const history = parsePeakDemandHistory(
        '2)(1-0:1.6.0)(1-0:1.6.0)(230201000000W)(230110174500W)(04.769*kW)(230301000000W',
      );

      expect(history.count).toBe(2);
      expect(history.log).toHaveLength(1);
    });
  });
});
