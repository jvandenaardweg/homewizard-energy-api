import { mockParsedTelegramResponse, mockTelegramResponse } from '@/mocks/data/telegram';
import { mockP1MeterDataResponse } from '@/mocks/data/data';
import {
  convertHexToAscii,
  parseHourlyReading,
  parseLine,
  parsePeakDemand,
  parsePeakDemandHistory,
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

      const expected = '2022-12-19T07:22:14+01:00';

      expect(parsedTimestamp).toBe(expected);
    });
    it('should parse a timestamp', () => {
      const parsedTimestamp = parseTimestamp('171130183027W');

      const expected = '2017-11-30T18:30:27+01:00';

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

    it('should use UTC+2 for summer time timestamps', () => {
      expect(parseTimestamp('260617151212S')).toBe('2026-06-17T15:12:12+02:00');
    });

    it('should use UTC+1 for winter time timestamps', () => {
      expect(parseTimestamp('261116200707W')).toBe('2026-11-16T20:07:07+01:00');
    });

    it('should not depend on the current date', () => {
      // On the 31st, setting the month before the day used to overflow into the next month
      vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
      expect(parseTimestamp('261116200707W')).toBe('2026-11-16T20:07:07+01:00');

      vi.setSystemTime(new Date('2026-03-31T22:30:00Z'));
      expect(parseTimestamp('260401003000S')).toBe('2026-04-01T00:30:00+02:00');
    });

    it('should determine the offset from the date when there is no DST marker', () => {
      expect(parseTimestamp('180902110000')).toBe('2018-09-02T11:00:00+02:00');
      expect(parseTimestamp('180102110000')).toBe('2018-01-02T11:00:00+01:00');
      // European summer time starts on the last Sunday of March and ends on the last Sunday of October
      expect(parseTimestamp('260329015959')).toBe('2026-03-29T01:59:59+01:00');
      expect(parseTimestamp('260329030000')).toBe('2026-03-29T03:00:00+02:00');
      expect(parseTimestamp('261025040000')).toBe('2026-10-25T04:00:00+01:00');
    });
  });

  describe('parsePeakDemand', () => {
    it('should parse a peak demand with its timestamp', () => {
      expect(parsePeakDemand('230903114500S)(02.762*kW')).toStrictEqual({
        timestamp: '2023-09-03T11:45:00+02:00',
        value: 2.762,
        unit: 'kW',
      });
    });

    it('should return nulls for a value it cannot read', () => {
      expect(parsePeakDemand('')).toStrictEqual({ timestamp: null, value: null, unit: null });
      expect(parsePeakDemand('230903114500S')).toStrictEqual({
        timestamp: null,
        value: null,
        unit: null,
      });
    });
  });

  describe('parsePeakDemandHistory', () => {
    it('should parse each month of the history', () => {
      expect(
        parsePeakDemandHistory(
          '2)(1-0:1.6.0)(1-0:1.6.0)(230201000000W)(230110174500W)(04.769*kW)(230301000000W)(230212181500W)(05.012*kW',
        ),
      ).toStrictEqual({
        count: 2,
        log: [
          {
            endOfPeriod: '2023-02-01T00:00:00+01:00',
            timestamp: '2023-01-10T17:45:00+01:00',
            value: 4.769,
            unit: 'kW',
          },
          {
            endOfPeriod: '2023-03-01T00:00:00+01:00',
            timestamp: '2023-02-12T18:15:00+01:00',
            value: 5.012,
            unit: 'kW',
          },
        ],
      });
    });

    it('should return an empty history when there are no months yet', () => {
      expect(parsePeakDemandHistory('0')).toStrictEqual({ count: 0, log: [] });
      expect(parsePeakDemandHistory('')).toStrictEqual({ count: 0, log: [] });
    });

    it('should skip an incomplete entry and keep a value without a unit', () => {
      expect(
        parsePeakDemandHistory(
          '2)(1-0:1.6.0)(1-0:1.6.0)(230201000000W)(230110174500W)(04.769)(230301000000W',
        ),
      ).toStrictEqual({
        count: 2,
        log: [
          {
            endOfPeriod: '2023-02-01T00:00:00+01:00',
            timestamp: '2023-01-10T17:45:00+01:00',
            value: 4.769,
            unit: null,
          },
        ],
      });
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
            startOfFailure: '2017-11-30T18:14:43+01:00',
            endOfFailure: '2017-11-30T18:30:27+01:00',
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
            startOfFailure: '2018-03-27T06:38:11+02:00',
            endOfFailure: '2018-03-27T06:41:11+02:00',
            duration: 180,
            unit: 's',
          },
          {
            startOfFailure: '2019-01-08T10:16:00+01:00',
            endOfFailure: '2019-01-08T10:59:23+01:00',
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
            startOfFailure: '2018-08-24T13:03:42+02:00',
            endOfFailure: '2018-08-24T14:37:02+02:00',
            duration: 5600,
            unit: 's',
          },
          {
            startOfFailure: '1931-12-13T20:45:54Z',
            endOfFailure: '2000-01-01T00:00:01+01:00',
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

    it('should parse the BE gas reading (0-1:24.2.3)', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50be']);

      expect(parsedTelegram.gas.value).toBe(2559.077);
      expect(parsedTelegram.gas.unit).toBe('m3');
      expect(parsedTelegram.gas.timestamp).toBe(parseTimestamp('210320214626W'));
    });

    it('should parse the BE capacity tariff lines (1-0:1.4.0, 1-0:1.6.0 and 0-0:98.1.0)', () => {
      const log = vi.fn();
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50beDemand'], log);
      const { demand } = parsedTelegram.power;

      expect(demand.average).toStrictEqual({ value: 0.255, unit: 'kW' });
      expect(demand.monthlyPeak).toStrictEqual({
        timestamp: '2023-09-03T11:45:00+02:00',
        value: 2.762,
        unit: 'kW',
      });
      expect(demand.monthlyPeakHistory.count).toBe(8);
      expect(demand.monthlyPeakHistory.log).toHaveLength(8);
      expect(demand.monthlyPeakHistory.log[0]).toStrictEqual({
        endOfPeriod: '2023-02-01T00:00:00+01:00',
        timestamp: '2023-01-10T17:45:00+01:00',
        value: 4.769,
        unit: 'kW',
      });
      expect(demand.monthlyPeakHistory.log[7]).toStrictEqual({
        endOfPeriod: '2023-09-01T00:00:00+02:00',
        timestamp: '2023-08-12T11:15:00+02:00',
        value: 2.727,
        unit: 'kW',
      });
      expect(log).not.toHaveBeenCalled();
    });

    it('should leave the demand empty when the meter does not send it', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50l3_2']);

      expect(parsedTelegram.power.demand).toStrictEqual({
        average: { value: null, unit: null },
        monthlyPeak: { timestamp: null, value: null, unit: null },
        monthlyPeakHistory: { count: null, log: [] },
      });
    });

    it('should parse a real CRLF telegram consistently with the /api/v1/data response', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50l3_3']);
      const data = mockP1MeterDataResponse;
      const { power, gas } = parsedTelegram;

      expect(parsedTelegram.meter).toStrictEqual({ brand: 'ISK5', model: '2M550T-1012' });
      expect(parsedTelegram.version).toBe('50');
      expect(parsedTelegram.timestamp).toBe('2026-11-16T20:07:07+01:00');
      expect(parsedTelegram.equipmentId).toBe(data.unique_id);
      expect(parsedTelegram.textMessage.message).toBe('');

      expect(power.tariffIndicator).toBe(data.active_tariff);
      expect(power.import.t1.value).toBe(data.total_power_import_t1_kwh);
      expect(power.import.t2.value).toBe(data.total_power_import_t2_kwh);
      expect(power.export.t1.value).toBe(data.total_power_export_t1_kwh);
      expect(power.export.t2.value).toBe(data.total_power_export_t2_kwh);
      expect(power.import.active.value).toBe(0.398);
      expect(power.instantaneous.power.positive.l2.value).toBe(0.13);
      expect(power.instantaneous.voltage.l1.value).toBe(data.active_voltage_l1_v);
      expect(power.instantaneous.voltage.l2.value).toBe(data.active_voltage_l2_v);
      expect(power.instantaneous.voltage.l3.value).toBe(data.active_voltage_l3_v);
      expect(power.voltageSags).toStrictEqual({
        l1: data.voltage_sag_l1_count,
        l2: data.voltage_sag_l2_count,
        l3: data.voltage_sag_l3_count,
      });
      expect(power.voltageSwell).toStrictEqual({
        l1: data.voltage_swell_l1_count,
        l2: data.voltage_swell_l2_count,
        l3: data.voltage_swell_l3_count,
      });
      expect(power.numberOfPowerFailures).toBe(data.any_power_fail_count);
      expect(power.numberOfLongPowerFailures).toBe(data.long_power_fail_count);

      // The event log mixes winter (W) and summer (S) timestamps
      expect(power.longPowerFailureLog).toStrictEqual({
        count: 4,
        log: [
          {
            startOfFailure: '2017-11-30T18:14:43+01:00',
            endOfFailure: '2017-11-30T18:30:27+01:00',
            duration: 944,
            unit: 's',
          },
          {
            startOfFailure: '2026-05-05T08:17:40+02:00',
            endOfFailure: '2026-05-05T11:01:22+02:00',
            duration: 9822,
            unit: 's',
          },
          {
            startOfFailure: '2026-06-17T08:11:27+02:00',
            endOfFailure: '2026-06-17T15:12:12+02:00',
            duration: 25245,
            unit: 's',
          },
          {
            startOfFailure: '2026-10-08T09:37:32+02:00',
            endOfFailure: '2026-10-08T11:58:41+02:00',
            duration: 8469,
            unit: 's',
          },
        ],
      });

      expect(gas.equipmentId).toBe(data.gas_unique_id);
      expect(gas.value).toBe(data.total_gas_m3);
      expect(gas.timestamp).toBe('2026-11-16T20:05:01+01:00');
    });

    it('should return null for the meter model when the header has none', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v42']);

      expect(parsedTelegram.meter).toStrictEqual({ brand: 'KFM5KAIFA-METER', model: null });
    });

    it('should keep the decimals of voltages and currents', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50be']);
      const { voltage, current } = parsedTelegram.power.instantaneous;

      expect(voltage.l1.value).toBe(240.9);
      expect(current.l1.value).toBe(2.22);
    });
  });

  describe('parseTelegram() edge cases', () => {
    it('should parse a DSMR 2.2 telegram and add a server timestamp', () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00.500Z'));

      const parsedTelegram = parseTelegram(mockTelegramResponse['v22']);

      expect(parsedTelegram.version).toBe('22');
      expect(parsedTelegram.timestamp).toBe('2024-01-01T12:00:00.000Z');
      expect(parsedTelegram.textMessage.codes).toBe('');
      expect(parsedTelegram.gas.timestamp).toBe(parseTimestamp('180902110000'));
      expect(parsedTelegram.gas.unit).toBe('m3');
      expect(parsedTelegram.gas.value).toBe(12007.76);
    });

    it('should pass lines it cannot parse to the log function', () => {
      const log = vi.fn();

      parseTelegram('/ISK5\\2M550T-1012\n\n1-0:1.8.1(000001.000*kWh)\nnot a telegram line\n!', log);

      expect(log).toHaveBeenCalledWith('Unable to parse line: not a telegram line');
    });

    it('should not log lines it cannot parse without a log function', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      parseTelegram('/ISK5\\2M550T-1012\n\n1-0:1.8.1(000001.000*kWh)\nnot a telegram line\n!');

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should default an empty hourly gas reading to 0 without a unit', () => {
      const parsedTelegram = parseTelegram('/ISK5\\2M550T-1012\n\n1-3:0.2.8(50)\n0-1:24.2.1()\n!');

      expect(parsedTelegram.gas.timestamp).toBeNull();
      expect(parsedTelegram.gas.value).toBe(0);
      expect(parsedTelegram.gas.unit).toBeNull();
    });
  });

  describe('parser helper edge cases', () => {
    it('should return an empty power failure log for a value without entries', () => {
      expect(parsePowerFailureEventLog('')).toStrictEqual({ count: 0, log: [] });
    });

    it('should return null for an empty hourly reading', () => {
      expect(parseHourlyReading(null)).toBeNull();
      expect(parseHourlyReading('')).toBeNull();
    });

    it('should return empty fields for an hourly reading without a value part', () => {
      expect(parseHourlyReading('221219072008W')).toStrictEqual({
        timestamp: null,
        value: null,
        unit: null,
      });
    });

    it('should return an empty string when converting a non-string hex value', () => {
      expect(convertHexToAscii(null as unknown as string)).toBe('');
    });
  });
});
