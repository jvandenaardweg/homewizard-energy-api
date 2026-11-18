export type TelegramUnit = 'kWh' | 'kW' | 'A' | 'V' | 's' | 'm3';

export interface TelegramHourlyReading {
  timestamp: string | null;
  value: string | null;
  unit: TelegramUnit | null;
}

export interface TelegramValueItem {
  value: number | null;
  unit: TelegramUnit | null;
}

export interface TelegramPowerFailureLogItem {
  startOfFailure: string | null;
  endOfFailure: string | null;
  duration: number | null;
  unit: TelegramUnit | null;
}

export interface TelegramPowerFailureLog {
  count: number | null;
  log: TelegramPowerFailureLogItem[];
}

export interface TelegramPeakDemand {
  /** When the peak was registered. */
  timestamp: string | null;
  value: number | null;
  unit: TelegramUnit | null;
}

export interface TelegramPeakDemandHistoryItem extends TelegramPeakDemand {
  /** The end of the month (billing period) this peak belongs to. */
  endOfPeriod: string | null;
}

export interface TelegramPeakDemandHistory {
  count: number | null;
  log: TelegramPeakDemandHistoryItem[];
}

// https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_a727fce1f1.pdf
// https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_40f025334f.pdf
export interface ParsedTelegram {
  meter: {
    brand: string | null;
    model: string | null;
  };
  /** Version information for P1 output */
  version: string | null;
  /** Date-time stamp of the P1 message. Value unit `YYMMDDhhmmssX` */
  timestamp: string | null;
  /** Equipment identifier */
  equipmentId: string | null;
  /** Text message max 1024 characters. */
  textMessage: {
    codes: string | null;
    message: string | null;
  };
  power: {
    import: {
      t1: TelegramValueItem;
      t2: TelegramValueItem;
      active: TelegramValueItem;
    };
    export: {
      t1: TelegramValueItem;
      t2: TelegramValueItem;
      active: TelegramValueItem;
    };
    /**
     * The demand used for the capacity tariff. Only sent by meters that register it, like the Belgian (Fluvius) meters.
     *
     * @link https://api-documentation.homewizard.com/docs/v2/measurement#capacity-rate
     */
    demand: {
      /** The average demand of the current quarter-hour (`1-0:1.4.0`). */
      average: TelegramValueItem;
      /** The peak demand of the running month, and when it was registered (`1-0:1.6.0`). */
      monthlyPeak: TelegramPeakDemand;
      /** The peak demand of each of the last 13 months at most (`0-0:98.1.0`). */
      monthlyPeakHistory: TelegramPeakDemandHistory;
    };
    /** Tariff indicator electricity. The tariff indicator can also be used to switch tariff dependent loads e.g boilers. This is the responsibility of the P1 user */
    tariffIndicator: number | null;
    threshold: TelegramValueItem;
    fuseThreshold: TelegramValueItem;
    switchPosition: string | null;
    numberOfPowerFailures: number | null;
    numberOfLongPowerFailures: number | null;
    /** Power Failure Event Log (long power failures). Value unit `Timestamp (end of failure) – duration in seconds` */
    longPowerFailureLog: TelegramPowerFailureLog;
    voltageSags: {
      l1: number | null;
      l2: number | null;
      l3: number | null;
    };
    voltageSwell: {
      l1: number | null;
      l2: number | null;
      l3: number | null;
    };
    instantaneous: {
      current: {
        l1: TelegramValueItem;
        l2: TelegramValueItem;
        l3: TelegramValueItem;
      };
      voltage: {
        l1: TelegramValueItem;
        l2: TelegramValueItem;
        l3: TelegramValueItem;
      };
      power: {
        positive: {
          l1: TelegramValueItem;
          l2: TelegramValueItem;
          l3: TelegramValueItem;
        };
        negative: {
          l1: TelegramValueItem;
          l2: TelegramValueItem;
          l3: TelegramValueItem;
        };
      };
    };
  };
  gas: {
    deviceType: string | null;
    equipmentId: string | null;
    timestamp: string | null;
    value: number | null;
    unit: TelegramUnit | null;
    valvePosition: string | null;
  };
}

/**
 * Parses a P1 telegram. Lines it doesn't recognise are passed to `log`, which does nothing by default.
 *
 * An empty telegram (no lines, or only whitespace) gives a result with every field `null`.
 */
export function parseTelegram(
  telegram: string,
  log: (message: string) => void = () => undefined,
): ParsedTelegram {
  const allLines = telegram
    .trim()
    .split(/\r\n|\n|\r/)
    .filter(Boolean); // filter out empty lines

  const parsedTelegram = createEmptyTelegram();

  if (allLines.length === 0) return parsedTelegram;

  // The header is `/` followed by the brand and, after a backslash, the model
  const [brand, model] = allLines[0].substring(1).split('\\');
  parsedTelegram.meter = { brand, model: model ?? null };

  // Leave out the header and the footer (`!` and the checksum)
  for (const line of allLines.slice(1, -1)) {
    const parsedLine = parseLine(line);
    const field = parsedLine && OBIS_FIELDS.get(parsedLine.obisCode);

    if (parsedLine && field) {
      const [path, conversion] = field;
      setField(parsedTelegram, path, conversion.convert(parsedLine));
    } else if (DSMR22_GAS_VALUE_LINE.test(line)) {
      parsedTelegram.gas.value = parseFloat(line.substring(1, 10));
    } else {
      log(`Unable to parse line: ${line}`);
    }
  }

  // Without a version we assume DSMR 2.2, which sends no timestamp either, so we use the current time
  if (parsedTelegram.version === null) {
    parsedTelegram.version = '22';

    // Take the current time but ignore the milliseconds
    const now = new Date();
    now.setMilliseconds(0);
    parsedTelegram.timestamp = now.toISOString();
  }

  return parsedTelegram;
}

/** A line of format `obisCode(value*unit)`, example: `1-0:2.8.1(123456.789*kWh)` */
type TelegramParsedLine = { obisCode: string; value: string; unit: TelegramUnit | null };

/**
 * How the value of a line becomes a field of the result.
 *
 * A conversion that returns an object writes its fields into the object at the field's path, so a line can fill a
 * few fields of an object (the gas readings), and the other fields stay as they are.
 */
interface Conversion<T> {
  /** The value of the field when the telegram has no line for it. */
  empty: () => T;
  convert: (line: TelegramParsedLine) => T;
}

const text: Conversion<string | null> = {
  empty: () => null,
  convert: line => line.value,
};

const integer: Conversion<number | null> = {
  empty: () => null,
  convert: line => parseInt(line.value),
};

const timestamp: Conversion<string | null> = {
  empty: () => null,
  convert: line => parseTimestamp(line.value),
};

/** Hexadecimal encoded text, e.g. `0x414243` or `41 42 43` -> `ABC`. Zero bytes and invalid pairs are skipped. */
const hexText: Conversion<string | null> = {
  empty: () => null,
  convert: line => {
    const hex = line.value.replace(/\s+/gi, '');
    const characters = [];

    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (!isNaN(code) && code !== 0) {
        characters.push(String.fromCharCode(code));
      }
    }

    return characters.join('');
  },
};

const valueItem: Conversion<TelegramValueItem> = {
  empty: () => ({ value: null, unit: null }),
  convert: line => ({ value: parseFloat(line.value), unit: line.unit }),
};

/** A value item that always gets `unit`, whatever unit the line has. */
const valueItemIn = (unit: TelegramUnit): Conversion<TelegramValueItem> => ({
  empty: valueItem.empty,
  convert: line => ({ value: parseFloat(line.value), unit }),
});

/** Format: `timestamp)(value*unit`, example: `230903114500S)(02.762*kW` */
const peakDemand: Conversion<TelegramPeakDemand> = {
  empty: () => ({ timestamp: null, value: null, unit: null }),
  convert: line => {
    const reading = parseHourlyReading(line.value);

    return {
      timestamp: parseTimestamp(reading?.timestamp),
      value: reading?.value ? parseFloat(reading.value) : null,
      unit: reading?.unit || null,
    };
  },
};

/**
 * Format: `count)(1-0:1.6.0)(1-0:1.6.0)(end of period)(timestamp)(value*unit)(end of period)(timestamp)(value*unit...`
 *
 * Example: `2)(1-0:1.6.0)(1-0:1.6.0)(230201000000W)(230110174500W)(04.769*kW)(230301000000W)(230212181500W)(05.012*kW`
 */
const peakDemandHistory: Conversion<TelegramPeakDemandHistory> = {
  empty: () => ({ count: null, log: [] }),
  convert: line => {
    const parts = line.value.split(')(');

    const output: TelegramPeakDemandHistory = {
      count: parseInt(parts[0]) || 0,
      log: [],
    };

    // After the count come two references to the OBIS code of the values (1-0:1.6.0), then the entries
    const entries = parts.slice(1).filter(part => !part.includes(':'));

    for (let i = 0; i + 2 < entries.length; i = i + 3) {
      const [peakValue, peakUnit] = entries[i + 2].split('*');

      output.log.push({
        endOfPeriod: parseTimestamp(entries[i]),
        timestamp: parseTimestamp(entries[i + 1]),
        value: parseFloat(peakValue),
        unit: (peakUnit as TelegramUnit) || null,
      });
    }

    return output;
  },
};

/** Format: `count)(0-0:96.7.19)(timestamp end)(duration)(timestamp end)(duration...` */
const powerFailureLog: Conversion<TelegramPowerFailureLog> = {
  empty: () => ({ count: null, log: [] }),
  convert: line => {
    const split = line.value.split(')(0-0:96.7.19)(');

    const output = {
      count: parseInt(split[0]) || 0,
      log: [] as TelegramPowerFailureLogItem[],
    };

    if (split[1]) {
      const log = split[1].split(')(');

      // Loop the log structure: timestamp)(duration)(timestamp)(duration...
      for (let i = 0; i <= log.length; i = i + 2) {
        if (log[i] && log[i + 1]) {
          // log[i] is a non-empty string here, so parseTimestamp() always returns a timestamp
          const endOfFailure = parseTimestamp(log[i]) as string;
          const duration = parseInt(log[i + 1].split('*')[0]);
          const startOfFailure = new Date(endOfFailure);
          startOfFailure.setSeconds(startOfFailure.getSeconds() - duration);

          const logEntry = {
            startOfFailure: formatIsoLocal(startOfFailure),
            endOfFailure,
            duration,
            unit: log[i + 1].split('*')[1] ?? null,
          } as TelegramPowerFailureLogItem;

          output.log.push(logEntry);
        }
      }
    }

    return output;
  },
};

type Gas = ParsedTelegram['gas'];

/**
 * The hourly (or 5-minute) reading of the gas meter (DSMR 4.0+), of format `timestamp)(value*unit`. A reading
 * without a value is `0`.
 */
const gasReading: Conversion<Pick<Gas, 'timestamp' | 'value' | 'unit'>> = {
  empty: () => ({ timestamp: null, value: null, unit: null }),
  convert: line => {
    const reading = parseHourlyReading(line.value);

    return {
      timestamp: parseTimestamp(reading?.timestamp),
      value: parseFloat(reading?.value || '0'),
      unit: reading?.unit || null,
    };
  },
};

/**
 * The gas reading of DSMR 2.2, of format `timestamp)(00)(60)(1)(0-1:24.2.1)(unit`. Its value comes on the next line,
 * see `DSMR22_GAS_VALUE_LINE`.
 */
const dsmr22GasReading: Conversion<Pick<Gas, 'timestamp' | 'unit'>> = {
  empty: () => ({ timestamp: null, unit: null }),
  convert: line => {
    const split = line.value.split(')(');

    return {
      timestamp: parseTimestamp(split[0]),
      unit: (split[5] as TelegramUnit | undefined) ?? null,
    };
  },
};

/**
 * Due to a 'bug' in DSMR 2.2 the value of the gas reading (`0-1:24.3.0`) is put on a separate line, of format
 * `(012345.678)`. A line that has no OBIS code we know and contains such a value is taken as that value.
 */
const DSMR22_GAS_VALUE_LINE = /\([0-9]{5}\.[0-9]{3}\)/;

/** The dot-separated path of every field of `T`, down to the objects. Arrays are fields, not paths into them. */
type FieldPath<T, Prefix extends string = ''> = {
  [K in keyof T & string]:
    | `${Prefix}${K}`
    | (T[K] extends readonly unknown[]
        ? never
        : T[K] extends object
          ? FieldPath<T[K], `${Prefix}${K}.`>
          : never);
}[keyof T & string];

type FieldAt<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? FieldAt<T[Key], Rest>
    : never
  : Path extends keyof T
    ? T[Path]
    : never;

type ObisField = {
  [Path in FieldPath<ParsedTelegram>]: readonly [
    Path,
    Conversion<Partial<FieldAt<ParsedTelegram, Path>>>,
  ];
}[FieldPath<ParsedTelegram>];

/**
 * The OBIS code of each line we read, the path of the field it fills, and how its value is converted.
 *
 * The rows follow the order of `ParsedTelegram`, because the empty result is built from them, which sets the order
 * of its keys.
 *
 * - https://github.com/dsmrreader/dsmr-reader/blob/4d07f391cbf84edaace9aab85c1c22a0080a27e9/dsmr_parser/obis_references.py
 * - 2016: https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_a727fce1f1.pdf
 * - 2014: https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_40f025334f.pdf
 */
const OBIS_TABLE = {
  // Version information for P1 output (NL, BE)
  '1-3:0.2.8': ['version', text],
  '0-0:96.1.4': ['version', text],
  // Date-time stamp of the P1 message
  '0-0:1.0.0': ['timestamp', timestamp],
  // Equipment identifier
  '0-0:96.1.1': ['equipmentId', text],
  // Text message codes, and the text message of max 1024 characters
  '0-0:96.13.1': ['textMessage.codes', text],
  '0-0:96.13.0': ['textMessage.message', hexText],

  // Meter reading electricity delivered to client (tariff 1 and 2) in 0,001 kWh
  '1-0:1.8.1': ['power.import.t1', valueItem],
  '1-0:1.8.2': ['power.import.t2', valueItem],
  // Actual electricity power delivered (+P) in 1 Watt resolution
  '1-0:1.7.0': ['power.import.active', valueItem],
  // Meter reading electricity delivered by client (tariff 1 and 2) in 0,001 kWh
  '1-0:2.8.1': ['power.export.t1', valueItem],
  '1-0:2.8.2': ['power.export.t2', valueItem],
  // Actual electricity power received (-P) in 1 Watt resolution
  '1-0:2.7.0': ['power.export.active', valueItem],

  // Capacity tariff (BE): the average demand of the current quarter-hour, the peak demand of the running month and
  // when it was registered, and the peak demand of the last 13 months at most
  '1-0:1.4.0': ['power.demand.average', valueItem],
  '1-0:1.6.0': ['power.demand.monthlyPeak', peakDemand],
  '0-0:98.1.0': ['power.demand.monthlyPeakHistory', peakDemandHistory],

  // Tariff indicator electricity. It can also be used to switch tariff dependent loads e.g boilers, which is the
  // responsibility of the P1 user
  '0-0:96.14.0': ['power.tariffIndicator', integer],
  // The actual threshold electricity in kW, probably not available anymore (page 25 of the 2014 document)
  '0-0:17.0.0': ['power.threshold', valueItem],
  // The fuse threshold (eMUCs 1.4), in A
  '1-0:31.4.0': ['power.fuseThreshold', valueItemIn('A')],
  // Switch position electricity (in/out/enabled), probably not available anymore (page 25 of the 2014 document)
  '0-0:96.3.10': ['power.switchPosition', text], // TODO: parseBreaker

  // Number of power failures, and of long power failures, in any phase
  '0-0:96.7.21': ['power.numberOfPowerFailures', integer],
  '0-0:96.7.9': ['power.numberOfLongPowerFailures', integer],
  // Power failure event log (long power failures)
  '1-0:99.97.0': ['power.longPowerFailureLog', powerFailureLog],

  // Number of voltage sags in phase L1, L2 and L3
  '1-0:32.32.0': ['power.voltageSags.l1', integer],
  '1-0:52.32.0': ['power.voltageSags.l2', integer],
  '1-0:72.32.0': ['power.voltageSags.l3', integer],
  // Number of voltage swells in phase L1, L2 and L3
  '1-0:32.36.0': ['power.voltageSwell.l1', integer],
  '1-0:52.36.0': ['power.voltageSwell.l2', integer],
  '1-0:72.36.0': ['power.voltageSwell.l3', integer],

  // Instantaneous current L1, L2 and L3 in A resolution
  '1-0:31.7.0': ['power.instantaneous.current.l1', valueItem],
  '1-0:51.7.0': ['power.instantaneous.current.l2', valueItem],
  '1-0:71.7.0': ['power.instantaneous.current.l3', valueItem],
  // Instantaneous voltage L1, L2 and L3 in V resolution (DSMR 5.0)
  '1-0:32.7.0': ['power.instantaneous.voltage.l1', valueItem],
  '1-0:52.7.0': ['power.instantaneous.voltage.l2', valueItem],
  '1-0:72.7.0': ['power.instantaneous.voltage.l3', valueItem],
  // Instantaneous active power L1, L2 and L3 (+P) in W resolution
  '1-0:21.7.0': ['power.instantaneous.power.positive.l1', valueItem],
  '1-0:41.7.0': ['power.instantaneous.power.positive.l2', valueItem],
  '1-0:61.7.0': ['power.instantaneous.power.positive.l3', valueItem],
  // Instantaneous active power L1, L2 and L3 (-P) in W resolution
  '1-0:22.7.0': ['power.instantaneous.power.negative.l1', valueItem],
  '1-0:42.7.0': ['power.instantaneous.power.negative.l2', valueItem],
  '1-0:62.7.0': ['power.instantaneous.power.negative.l3', valueItem],

  /*
   * The Smart Meter has 4 M-Bus interfaces which allow to connect external devices like a Gas, Thermal, Water or slave
   * Electricity meter. The OBIS code of external devices starts with 0-n (where n is a number from 1 to 4).
   *
   * However, the way to correctly determine the type of external device that is connected to each M-Bus is very
   * poorly documented. At the moment only Gas meters are being installed by the grid companies as far as I know, so
   * we assume every M-Bus device is a gas meter.
   */

  // Device type
  '0-1:24.1.0': ['gas.deviceType', text],
  '0-2:24.1.0': ['gas.deviceType', text],
  '0-3:24.1.0': ['gas.deviceType', text],
  '0-4:24.1.0': ['gas.deviceType', text],
  // Equipment identifier (gas, thermal: heat or cold, water)
  '0-1:96.1.0': ['gas.equipmentId', text],
  '0-2:96.1.0': ['gas.equipmentId', text],
  '0-3:96.1.0': ['gas.equipmentId', text],
  '0-4:96.1.0': ['gas.equipmentId', text],
  '0-1:96.1.1': ['gas.equipmentId', text],
  // Last 5-minute value (temperature converted), gas delivered to client in m3, including decimal values and capture
  // time. Also: heat or cold in 0,01 GJ, water in 0,001 m3, or the reading of a slave E meter
  '0-1:24.2.1': ['gas', gasReading],
  '0-2:24.2.1': ['gas', gasReading],
  '0-3:24.2.1': ['gas', gasReading],
  '0-4:24.2.1': ['gas', gasReading],
  // Last value of gas delivered to client in m3 and capture time (BE)
  '0-1:24.2.3': ['gas', gasReading],
  // Gas reading (DSMR 2.2)
  '0-1:24.3.0': ['gas', dsmr22GasReading],
  // Valve position (BE)
  '0-1:24.4.0': ['gas.valvePosition', text],
  '0-2:24.4.0': ['gas.valvePosition', text],
  '0-3:24.4.0': ['gas.valvePosition', text],
  '0-4:24.4.0': ['gas.valvePosition', text],
} as const satisfies Record<string, ObisField>;

const OBIS_FIELDS: ReadonlyMap<string, ObisField> = new Map(Object.entries(OBIS_TABLE));

/** The dot-separated path of every value of `T`, where arrays are values. */
type ValuePath<T, Path extends string> = T extends readonly unknown[]
  ? Path
  : T extends object
    ? { [K in keyof T & string]-?: ValuePath<T[K], `${Path}.${K}`> }[keyof T & string]
    : Path;

type ObisValuePath = {
  [Code in keyof typeof OBIS_TABLE]: (typeof OBIS_TABLE)[Code] extends readonly [
    infer Path extends string,
    Conversion<infer T>,
  ]
    ? ValuePath<T, Path>
    : never;
}[keyof typeof OBIS_TABLE];

/**
 * The values of `ParsedTelegram` that no row of the OBIS table fills. The meter comes from the header. This fails to
 * compile, naming the values, when a field is added to `ParsedTelegram` without a row.
 */
type ValuesWithoutObisCode = Exclude<
  ValuePath<Omit<ParsedTelegram, 'meter'>, ''>,
  `.${ObisValuePath}`
>;
// oxlint-disable-next-line no-unused-vars
type AssertEveryValueHasAnObisCode<T extends never = ValuesWithoutObisCode> = T;

function createEmptyTelegram(): ParsedTelegram {
  const telegram = { meter: { brand: null, model: null } } as ParsedTelegram;

  for (const [path, conversion] of OBIS_FIELDS.values()) {
    setField(telegram, path, conversion.empty());
  }

  return telegram;
}

/** Sets the field at `path`, creating the objects on the way. An object value is written into the object there. */
function setField(telegram: ParsedTelegram, path: string, value: unknown): void {
  const keys = path.split('.');
  const last = keys.pop() as string;
  let target = telegram as unknown as Record<string, unknown>;

  for (const key of keys) {
    target[key] ??= {};
    target = target[key] as Record<string, unknown>;
  }

  if (isObject(value) && isObject(target[last])) {
    Object.assign(target[last], value);
  } else {
    target[last] = value;
  }
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse a single line of format: obisCode(value*unit), example: 1-0:2.8.1(123456.789*kWh). Returns `null` for a line
 * without an OBIS code and a value.
 */
function parseLine(line: string): TelegramParsedLine | null {
  const split = line.split(/\((.+)?/); // Split only on first occurrence of "("

  if (!split[0] || !split[1]) return null;

  const obisCode = split[0];
  const value = split[1].substring(0, split[1].length - 1);

  if (value.indexOf('*') > -1 && value.indexOf(')(') === -1) {
    return { obisCode, value: value.split('*')[0], unit: value.split('*')[1] as TelegramUnit };
  }

  return { obisCode, value, unit: null };
}

const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * Returns the UTC time of the last Sunday of the given month (0-based) at 01:00 UTC,
 * which is when European summer time starts (March) and ends (October).
 */
function getEuropeanDstSwitch(year: number, month: number): number {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 1));
  const lastSunday = lastDayOfMonth.getUTCDate() - lastDayOfMonth.getUTCDay();

  return Date.UTC(year, month, lastSunday, 1);
}

/** The UTC offset of a timestamp's DST marker: `S` for summer time, `W` for winter time. */
const UTC_OFFSET_IN_HOURS_BY_DST_MARKER = { S: 2, W: 1 } as const;

type DstMarker = keyof typeof UTC_OFFSET_IN_HOURS_BY_DST_MARKER;

function isDstMarker(value: string): value is DstMarker {
  return value === 'S' || value === 'W';
}

/**
 * Returns the UTC offset of a local CET/CEST time, using the European summer time rules.
 * `localTimeAsUtc` is the local time with its digits read as UTC.
 */
function getEuropeanUtcOffsetInHours(localTimeAsUtc: number, year: number): number {
  const utcIfWinterTime = localTimeAsUtc - HOUR_IN_MS;
  const isSummerTime =
    utcIfWinterTime >= getEuropeanDstSwitch(year, 2) &&
    utcIfWinterTime < getEuropeanDstSwitch(year, 9);

  return isSummerTime ? 2 : 1;
}

/**
 * Parse timestamp of format: YYMMDDhhmmssX
 *
 * The timestamp is the meter's local time (CET/CEST, as used in the Netherlands, Belgium and Luxembourg).
 * `X` is `S` for summer time (UTC+2) or `W` for winter time (UTC+1). Timestamps without it (DSMR 2.2)
 * use the European summer time rules to determine the offset.
 */
function parseTimestamp(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;

  const year = parseInt(timestamp.substring(0, 2)) + 2000;

  // Build the timestamp in one go, so the current date can't overflow the day or month while setting each part
  const localTimeAsUtc = Date.UTC(
    year,
    parseInt(timestamp.substring(2, 4)) - 1,
    parseInt(timestamp.substring(4, 6)),
    parseInt(timestamp.substring(6, 8)),
    parseInt(timestamp.substring(8, 10)),
    parseInt(timestamp.substring(10, 12)),
  );

  const dstMarker = timestamp.charAt(12);
  const offsetInHours = isDstMarker(dstMarker)
    ? UTC_OFFSET_IN_HOURS_BY_DST_MARKER[dstMarker]
    : getEuropeanUtcOffsetInHours(localTimeAsUtc, year);

  return formatIsoLocal(new Date(localTimeAsUtc - offsetInHours * HOUR_IN_MS));
}

/**
 * Parse hourly readings, which is used for gas, water, heat, cold and slave electricity meters (DSMR 4.0+)
 */
function parseHourlyReading(reading: string | null): TelegramHourlyReading | null {
  if (!reading) return null;

  const output = {
    timestamp: null,
    value: null,
    unit: null,
  } as TelegramHourlyReading;

  const split = reading.split(')(');

  if (split[0] && split[1]) {
    output.timestamp = split[0];
    output.value = split[1].split('*')[0];
    output.unit = split[1].split('*')[1] as TelegramUnit;
  }

  return output;
}

// Credits to https://github.com/ruudverheijden/node-p1-reader for the initial idea.
// This code is based on that code, but has been heavily modified to support Typescript and to be more readable.

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/**
 * Formats a date in local time with its UTC offset, for example `2019-09-18T19:00:52+02:00`, or with `Z` when the
 * offset is zero. Throws a `RangeError` for an invalid date.
 */
function formatIsoLocal(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid time value');
  }

  // Positive behind UTC, as Date.getTimezoneOffset() returns it
  const offsetMinutes = date.getTimezoneOffset();
  const absolute = Math.abs(offsetMinutes);
  const offset =
    offsetMinutes === 0
      ? 'Z'
      : `${offsetMinutes < 0 ? '+' : '-'}${pad(Math.trunc(absolute / 60))}:${pad(absolute % 60)}`;

  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`
  );
}
