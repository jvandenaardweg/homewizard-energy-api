import { mockParsedTelegramResponse, mockTelegramResponse } from '@/mocks/data/telegram';
import { e } from 'vitest/dist/index-5aad25c1';
import {
  convertHexToAscii,
  parseHourlyReading,
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
  });
});
