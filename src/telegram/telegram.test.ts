import { mockParsedTelegramResponse, mockTelegramResponse } from '@/mocks/data/telegram';
import { parseTelegram } from './telegram';

/** A telegram with a header, the given lines and a footer. */
const telegram = (...lines: string[]) => `/ISK5\\2M550T-1012\n\n${lines.join('\n')}\n!`;

/** Parses a DSMR 5.0 telegram with the given lines. */
const parse = (...lines: string[]) => parseTelegram(telegram('1-3:0.2.8(50)', ...lines));

const timestampOf = (value: string) => parse(`0-0:1.0.0(${value})`).timestamp;

describe('parseTelegram', () => {
  describe('telegrams', () => {
    it('should parse a telegram', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50l3_2']);
      const expected = mockParsedTelegramResponse['v50l3_2'];

      expect(parsedTelegram).toStrictEqual(expected);
      // The keys come in the order of the type
      expect(JSON.stringify(parsedTelegram)).toBe(JSON.stringify(expected));
    });

    it('should parse the BE gas reading (0-1:24.2.3)', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50be']);

      expect(parsedTelegram.gas.value).toBe(2559.077);
      expect(parsedTelegram.gas.unit).toBe('m3');
      expect(parsedTelegram.gas.timestamp).toBe('2021-03-20T21:46:26+01:00');
    });

    it('should parse the BE version, switch position and threshold', () => {
      const parsedTelegram = parseTelegram(mockTelegramResponse['v50be']);

      expect(parsedTelegram.version).toBe('50215');
      expect(parsedTelegram.power.switchPosition).toBe('1');
      expect(parsedTelegram.power.threshold).toStrictEqual({ value: 999.9, unit: 'kW' });
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
      // The values the device's /api/v1/data sent with this telegram, as in mockP1MeterDataResponse in src/mocks/v1
      const data = {
        unique_id: '4530303939303031323334353637383930',
        active_tariff: 2,
        total_power_import_t1_kwh: 27968.53,
        total_power_import_t2_kwh: 29753.732,
        total_power_export_t1_kwh: 0.013,
        total_power_export_t2_kwh: 0.02,
        active_voltage_l1_v: 226,
        active_voltage_l2_v: 224.2,
        active_voltage_l3_v: 223.3,
        voltage_sag_l1_count: 19,
        voltage_sag_l2_count: 20,
        voltage_sag_l3_count: 25,
        voltage_swell_l1_count: 1,
        voltage_swell_l2_count: 9,
        voltage_swell_l3_count: 9,
        any_power_fail_count: 11,
        long_power_fail_count: 7,
        total_gas_m3: 11312.684,
        gas_unique_id: '4730303939303031323334353637383930',
      };
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

    it('should parse a DSMR 2.2 telegram and add a server timestamp', () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00.500Z'));

      const parsedTelegram = parseTelegram(mockTelegramResponse['v22']);

      expect(parsedTelegram.version).toBe('22');
      expect(parsedTelegram.timestamp).toBe('2024-01-01T12:00:00.000Z');
      expect(parsedTelegram.textMessage.codes).toBe('');
      expect(parsedTelegram.gas.timestamp).toBe('2018-09-02T11:00:00+02:00');
      expect(parsedTelegram.gas.unit).toBe('m3');
      expect(parsedTelegram.gas.value).toBe(12007.76);
    });

    it.each(['', ' \r\n \n'])(
      'should return every field as null for an empty telegram %j',
      input => {
        // Every value of the result, with the entries of the logs, which are empty here
        const values = (value: unknown): unknown[] =>
          value !== null && typeof value === 'object'
            ? Object.values(value).flatMap(values)
            : [value];
        const log = vi.fn();

        const parsedTelegram = parseTelegram(input, log);

        expect(values(parsedTelegram).length).toBeGreaterThan(0);
        expect(values(parsedTelegram).every(value => value === null)).toBe(true);
        expect(parsedTelegram.power.longPowerFailureLog.log).toStrictEqual([]);
        expect(log).not.toHaveBeenCalled();
      },
    );
  });

  describe('lines', () => {
    it('should pass lines it cannot parse to the log function', () => {
      const log = vi.fn();

      parseTelegram(telegram('1-0:1.8.1(000001.000*kWh)', 'not a telegram line', '1-0:1.8.2'), log);

      expect(log).toHaveBeenCalledWith('Unable to parse line: not a telegram line');
      expect(log).toHaveBeenCalledWith('Unable to parse line: 1-0:1.8.2');
      expect(log).toHaveBeenCalledTimes(2);
    });

    it('should pass lines with an OBIS code it does not know to the log function', () => {
      const log = vi.fn();

      parseTelegram(telegram('1-3:0.2.8(50)', '9-9:9.9.9(1*kWh)'), log);

      expect(log).toHaveBeenCalledExactlyOnceWith('Unable to parse line: 9-9:9.9.9(1*kWh)');
    });

    it('should not log lines it cannot parse without a log function', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      parseTelegram(telegram('1-0:1.8.1(000001.000*kWh)', 'not a telegram line'));

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should give a null unit for a value sent without one', () => {
      const parsedTelegram = parse(
        '1-0:1.8.1(000001.000)',
        '1-0:31.7.0(002)',
        '1-0:99.97.0(1)(0-0:96.7.19)(171130183027W)(0000000944)',
      );

      expect(parsedTelegram.power.import.t1).toStrictEqual({ value: 1, unit: null });
      expect(parsedTelegram.power.instantaneous.current.l1).toStrictEqual({ value: 2, unit: null });
      expect(parsedTelegram.power.longPowerFailureLog.log).toStrictEqual([
        {
          startOfFailure: '2017-11-30T18:14:43+01:00',
          endOfFailure: '2017-11-30T18:30:27+01:00',
          duration: 944,
          unit: null,
        },
      ]);
    });

    it('should give the fuse threshold in A', () => {
      expect(parse('1-0:31.4.0(025)').power.fuseThreshold).toStrictEqual({ value: 25, unit: 'A' });
    });

    it('should use the last line when a code comes twice', () => {
      expect(parse('1-0:1.8.1(1*kWh)', '1-0:1.8.1(2*kWh)').power.import.t1).toStrictEqual({
        value: 2,
        unit: 'kWh',
      });
    });
  });

  describe('text message', () => {
    it.each([
      ['68656c6c6f', 'hello'],
      ['0x68656c6c6f', 'hello'],
      ['0x68656c6c6f20776f726c64', 'hello world'],
      ['20 20 20 20 20 68 65 6c 6c 6f 20 20 20 20 20', '     hello     '],
      ['00680069', 'hi'],
      ['', ''],
    ])('should convert the hex %j to %j', (hex, expected) => {
      expect(parse(`0-0:96.13.0(${hex})`).textMessage.message).toBe(expected);
    });

    it('should keep the text message codes as they are', () => {
      expect(parse('0-0:96.13.1(303132)').textMessage.codes).toBe('303132');
    });
  });

  describe('timestamps', () => {
    it('should parse a timestamp', () => {
      expect(timestampOf('221219072214W')).toBe('2022-12-19T07:22:14+01:00');
      expect(timestampOf('171130183027W')).toBe('2017-11-30T18:30:27+01:00');
    });

    it('should return null for an empty timestamp', () => {
      expect(timestampOf('')).toBeNull();
    });

    it('should use UTC+2 for summer time timestamps', () => {
      expect(timestampOf('260617151212S')).toBe('2026-06-17T15:12:12+02:00');
    });

    it('should use UTC+1 for winter time timestamps', () => {
      expect(timestampOf('261116200707W')).toBe('2026-11-16T20:07:07+01:00');
    });

    it('should not depend on the current date', () => {
      // On the 31st, setting the month before the day used to overflow into the next month
      vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
      expect(timestampOf('261116200707W')).toBe('2026-11-16T20:07:07+01:00');

      vi.setSystemTime(new Date('2026-03-31T22:30:00Z'));
      expect(timestampOf('260401003000S')).toBe('2026-04-01T00:30:00+02:00');
    });

    it('should determine the offset from the date when there is no DST marker', () => {
      expect(timestampOf('180902110000')).toBe('2018-09-02T11:00:00+02:00');
      expect(timestampOf('180102110000')).toBe('2018-01-02T11:00:00+01:00');
      // European summer time starts on the last Sunday of March and ends on the last Sunday of October
      expect(timestampOf('260329015959')).toBe('2026-03-29T01:59:59+01:00');
      expect(timestampOf('260329030000')).toBe('2026-03-29T03:00:00+02:00');
      expect(timestampOf('261025040000')).toBe('2026-10-25T04:00:00+01:00');
    });

    it('should format in local time, with a zero offset as Z and an offset behind UTC with a minus', () => {
      const timestampIn = (timeZone: string) => {
        const previous = process.env.TZ;

        // Node reads TZ again when it changes
        process.env.TZ = timeZone;
        try {
          return timestampOf('190105090304W');
        } finally {
          process.env.TZ = previous;
        }
      };

      expect(timestampIn('UTC')).toBe('2019-01-05T08:03:04Z');
      expect(timestampIn('America/St_Johns')).toBe('2019-01-05T04:33:04-03:30');
    });

    it('should throw a RangeError for a timestamp it cannot read', () => {
      expect(() => timestampOf('nope')).toThrow(RangeError);
    });
  });

  describe('peak demand', () => {
    it('should parse a peak demand with its timestamp', () => {
      expect(parse('1-0:1.6.0(230903114500S)(02.762*kW)').power.demand.monthlyPeak).toStrictEqual({
        timestamp: '2023-09-03T11:45:00+02:00',
        value: 2.762,
        unit: 'kW',
      });
    });

    it.each(['', '230903114500S'])('should return nulls for a peak demand %j', value => {
      expect(parse(`1-0:1.6.0(${value})`).power.demand.monthlyPeak).toStrictEqual({
        timestamp: null,
        value: null,
        unit: null,
      });
    });

    it('should parse each month of the history', () => {
      const parsedTelegram = parse(
        '0-0:98.1.0(2)(1-0:1.6.0)(1-0:1.6.0)(230201000000W)(230110174500W)(04.769*kW)(230301000000W)(230212181500W)(05.012*kW)',
      );

      expect(parsedTelegram.power.demand.monthlyPeakHistory).toStrictEqual({
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

    it.each(['0', ''])('should return an empty history for %j', value => {
      expect(parse(`0-0:98.1.0(${value})`).power.demand.monthlyPeakHistory).toStrictEqual({
        count: 0,
        log: [],
      });
    });

    it('should skip an incomplete month and keep a value without a unit', () => {
      const parsedTelegram = parse(
        '0-0:98.1.0(2)(1-0:1.6.0)(1-0:1.6.0)(230201000000W)(230110174500W)(04.769)(230301000000W)',
      );

      expect(parsedTelegram.power.demand.monthlyPeakHistory).toStrictEqual({
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

  describe('power failure log', () => {
    const logOf = (value: string) => parse(`1-0:99.97.0(${value})`).power.longPowerFailureLog;

    it('should parse a power failure event log', () => {
      expect(logOf('1)(0-0:96.7.19)(171130183027W)(0000000944*s')).toStrictEqual({
        count: 1,
        log: [
          {
            startOfFailure: '2017-11-30T18:14:43+01:00',
            endOfFailure: '2017-11-30T18:30:27+01:00',
            duration: 944,
            unit: 's',
          },
        ],
      });
    });

    it('should parse failures in summer and winter time', () => {
      expect(
        logOf('2)(0-0:96.7.19)(180327064111S)(0000000180*s)(190108105923W)(0000002603*s'),
      ).toStrictEqual({
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
      });
    });

    it('should parse a failure with the largest duration', () => {
      expect(
        logOf('2)(0-0:96.7.19)(180824143702S)(0000005600*s)(000101000001W)(2147483647*s'),
      ).toStrictEqual({
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
      });
    });

    it('should skip an incomplete failure', () => {
      expect(logOf('2)(0-0:96.7.19)(171130183027W)(0000000944*s)(180327064111S')).toStrictEqual({
        count: 2,
        log: [
          {
            startOfFailure: '2017-11-30T18:14:43+01:00',
            endOfFailure: '2017-11-30T18:30:27+01:00',
            duration: 944,
            unit: 's',
          },
        ],
      });
    });

    it('should return an empty log for a value without failures', () => {
      expect(logOf('')).toStrictEqual({ count: 0, log: [] });
      expect(logOf('0)(0-0:96.7.19')).toStrictEqual({ count: 0, log: [] });
    });
  });

  describe('gas', () => {
    it.each([1, 2, 3, 4])('should read the gas meter on M-Bus %i', bus => {
      const parsedTelegram = parse(
        `0-${bus}:24.1.0(003)`,
        `0-${bus}:96.1.0(4730303132333435363738393031323334)`,
        `0-${bus}:24.2.1(221218224501W)(06798.545*m3)`,
        `0-${bus}:24.4.0(1)`,
      );

      expect(parsedTelegram.gas).toStrictEqual({
        deviceType: '003',
        equipmentId: '4730303132333435363738393031323334',
        timestamp: '2022-12-18T22:45:01+01:00',
        value: 6798.545,
        unit: 'm3',
        valvePosition: '1',
      });
    });

    it('should read the gas equipment identifier of 0-1:96.1.1', () => {
      expect(parse('0-1:96.1.1(4730)').gas.equipmentId).toBe('4730');
    });

    it('should default an empty hourly gas reading to 0 without a unit', () => {
      const parsedTelegram = parse('0-1:24.2.1()');

      expect(parsedTelegram.gas.timestamp).toBeNull();
      expect(parsedTelegram.gas.value).toBe(0);
      expect(parsedTelegram.gas.unit).toBeNull();
    });

    it('should default an hourly gas reading without a value to 0', () => {
      expect(parse('0-1:24.2.1(221219072008W)').gas).toMatchObject({
        timestamp: null,
        value: 0,
        unit: null,
      });
    });

    it('should give a null unit for a DSMR 2.2 gas reading sent without one', () => {
      const parsedTelegram = parseTelegram(
        telegram('0-1:24.3.0(180902110000)(00)(60)(1)(0-1:24.2.1)', '(12345.678)'),
      );

      expect(parsedTelegram.gas).toStrictEqual({
        deviceType: null,
        equipmentId: null,
        timestamp: '2018-09-02T11:00:00+02:00',
        value: 12345.678,
        unit: null,
        valvePosition: null,
      });
    });
  });
});
