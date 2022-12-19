import { formatISO } from 'date-fns';

export type TelegramParsedLine = { obisCode: string; value: string; unit: TelegramUnit };

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

export function parseTelegram(telegram: string): ParsedTelegram {
  const allLines = telegram
    .trim()
    .split(/\r\n|\n|\r/)
    .filter(Boolean); // filter out empty lines

  const header = allLines[0].substring(1);
  // const footer = allLines[allLines.length - 1];

  const [meterBrand, meterModal] = getMeterBrandModelFromHeader(header);

  const linesWithoutHeaderAndFooter = allLines
    .filter((_, index) => index > 0) // filter out header line
    .filter((_, index, arr) => index < arr.length - 1); // filter out footer line

  const parsedTelegram: ParsedTelegram = {
    meter: {
      brand: meterBrand,
      model: meterModal,
    },
    version: null,
    timestamp: null,
    equipmentId: null,
    textMessage: {
      codes: null,
      message: null,
    },
    power: {
      import: {
        t1: {
          value: null,
          unit: null,
        },
        t2: {
          value: null,
          unit: null,
        },
        active: {
          value: null,
          unit: null,
        },
      },
      export: {
        t1: {
          value: null,
          unit: null,
        },
        t2: {
          value: null,
          unit: null,
        },
        active: {
          value: null,
          unit: null,
        },
      },
      tariffIndicator: null,
      threshold: {
        value: null,
        unit: null,
      },
      fuseThreshold: {
        value: null,
        unit: null,
      },
      switchPosition: null,
      numberOfPowerFailures: null,
      numberOfLongPowerFailures: null,
      longPowerFailureLog: {
        count: null,
        log: [],
      },
      voltageSags: {
        l1: null,
        l2: null,
        l3: null,
      },
      voltageSwell: {
        l1: null,
        l2: null,
        l3: null,
      },
      instantaneous: {
        current: {
          l1: {
            value: null,
            unit: null,
          },
          l2: {
            value: null,
            unit: null,
          },
          l3: {
            value: null,
            unit: null,
          },
        },
        voltage: {
          l1: {
            value: null,
            unit: null,
          },
          l2: {
            value: null,
            unit: null,
          },
          l3: {
            value: null,
            unit: null,
          },
        },
        power: {
          positive: {
            l1: {
              value: null,
              unit: null,
            },
            l2: {
              value: null,
              unit: null,
            },
            l3: {
              value: null,
              unit: null,
            },
          },
          negative: {
            l1: {
              value: null,
              unit: null,
            },
            l2: {
              value: null,
              unit: null,
            },
            l3: {
              value: null,
              unit: null,
            },
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

  // Start parsing at line 3 since first two lines contain the header and an empty row
  for (const line of linesWithoutHeaderAndFooter) {
    // Ignore empty lines (by removing the newline breaks and trimming spaces)
    if (line.replace(/(\r\n|\n|\r)/gm, '').trim() != '') {
      const parsedLine = parseLine(line);

      // https://github.com/dsmrreader/dsmr-reader/blob/4d07f391cbf84edaace9aab85c1c22a0080a27e9/dsmr_parser/obis_references.py
      // 2016: https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_a727fce1f1.pdf
      // 2014: https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_40f025334f.pdf
      switch (parsedLine.obisCode) {
        // Version information for P1 output
        case '1-3:0.2.8': // version NL?
        case '0-0:96.1.4': // version BE
          parsedTelegram.version = parsedLine.value;
          break;

        // Date-time stamp of the P1 message
        case '0-0:1.0.0':
          parsedTelegram.timestamp = parseTimestamp(parsedLine.value);
          break;

        // Equipment identifier
        case '0-0:96.1.1':
          parsedTelegram.equipmentId = parsedLine.value;
          break;

        // TEXT_MESSAGE_CODE
        case '0-0:96.13.1':
          parsedTelegram.textMessage.codes = parsedLine.value;
          break;

        // Text message max 1024 characters.
        case '0-0:96.13.0':
          parsedTelegram.textMessage.message = convertHexToAscii(parsedLine.value);
          break;

        // Meter Reading electricity delivered to client (Tariff 1) in 0,001 kWh
        case '1-0:1.8.1':
          parsedTelegram.power.import.t1.value = parseFloat(parsedLine.value);
          parsedTelegram.power.import.t1.unit = parsedLine.unit;
          break;

        // Meter Reading electricity delivered to client (Tariff 2) in 0,001 kWh
        case '1-0:1.8.2':
          parsedTelegram.power.import.t2.value = parseFloat(parsedLine.value);
          parsedTelegram.power.import.t2.unit = parsedLine.unit;
          break;

        // Meter Reading electricity delivered by client (Tariff 1) in 0,001 kWh
        case '1-0:2.8.1':
          parsedTelegram.power.export.t1.value = parseFloat(parsedLine.value);
          parsedTelegram.power.export.t1.unit = parsedLine.unit;
          break;

        // Meter Reading electricity delivered by client (Tariff 2) in 0,001 kWh
        case '1-0:2.8.2':
          parsedTelegram.power.export.t2.value = parseFloat(parsedLine.value);
          parsedTelegram.power.export.t2.unit = parsedLine.unit;
          break;

        // Tariff indicator electricity.
        // The tariff indicator can also be used to switch tariff dependent loads e.g boilers.
        // This is the responsibility of the P1 user
        case '0-0:96.14.0':
          parsedTelegram.power.tariffIndicator = parseInt(parsedLine.value);
          break;

        // Actual electricity power delivered (+P) in 1 Watt resolution
        case '1-0:1.7.0':
          parsedTelegram.power.import.active.value = parseFloat(parsedLine.value);
          parsedTelegram.power.import.active.unit = parsedLine.unit;
          break;

        // Actual electricity power received (-P) in 1 Watt resolution
        case '1-0:2.7.0':
          parsedTelegram.power.export.active.value = parseFloat(parsedLine.value);
          parsedTelegram.power.export.active.unit = parsedLine.unit;
          break;

        // The actual threshold Electricity in kW
        // probably not available anymore?
        // page 25: https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_40f025334f.pdf
        case '0-0:17.0.0':
          parsedTelegram.power.threshold.value = parseFloat(parsedLine.value);
          parsedTelegram.power.threshold.unit = parsedLine.unit;
          break;

        // Switch position Electricity (in/out/enabled).
        // probably not available anymore?
        // page: 25https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_40f025334f.pdf
        case '0-0:96.3.10':
          parsedTelegram.power.switchPosition = parsedLine.value; // TODO: parseBreaker
          break;

        // Number of power failures in any phase
        case '0-0:96.7.21':
          parsedTelegram.power.numberOfPowerFailures = parseInt(parsedLine.value);
          break;

        // Number of long power failures in any phase
        case '0-0:96.7.9':
          parsedTelegram.power.numberOfLongPowerFailures = parseInt(parsedLine.value);
          break;

        // Power Failure Event Log (long power failures)
        case '1-0:99.97.0':
          parsedTelegram.power.longPowerFailureLog = parsePowerFailureEventLog(parsedLine.value);

          break;

        // Number of voltage sags in phase L1
        case '1-0:32.32.0':
          parsedTelegram.power.voltageSags.l1 = parseInt(parsedLine.value);
          break;

        // Number of voltage sags in phase L2
        case '1-0:52.32.0':
          parsedTelegram.power.voltageSags.l2 = parseInt(parsedLine.value);
          break;

        // Number of voltage sags in phase L3
        case '1-0:72.32.0':
          parsedTelegram.power.voltageSags.l3 = parseInt(parsedLine.value);
          break;

        // Number of voltage swells in phase L1
        case '1-0:32.36.0':
          parsedTelegram.power.voltageSwell.l1 = parseInt(parsedLine.value);
          break;

        // Number of voltage swells in phase L2
        case '1-0:52.36.0':
          parsedTelegram.power.voltageSwell.l2 = parseInt(parsedLine.value);
          break;

        // Number of voltage swells in phase L3
        case '1-0:72.36.0':
          parsedTelegram.power.voltageSwell.l3 = parseInt(parsedLine.value);
          break;

        // Instantaneous current L1 in A resolution.
        case '1-0:31.7.0':
          parsedTelegram.power.instantaneous.current.l1.value = parseInt(parsedLine.value);
          parsedTelegram.power.instantaneous.current.l1.unit = parsedLine.unit;
          break;

        // Instantaneous current L2 in A resolution.
        case '1-0:51.7.0':
          parsedTelegram.power.instantaneous.current.l2.value = parseInt(parsedLine.value);
          parsedTelegram.power.instantaneous.current.l2.unit = parsedLine.unit;
          break;

        // Instantaneous current L3 in A resolution
        case '1-0:71.7.0':
          parsedTelegram.power.instantaneous.current.l3.value = parseInt(parsedLine.value);
          parsedTelegram.power.instantaneous.current.l3.unit = parsedLine.unit;
          break;

        // Instantaneous active power L1 (+P) in W resolution
        case '1-0:21.7.0':
          parsedTelegram.power.instantaneous.power.positive.l1.value = parseFloat(parsedLine.value);
          parsedTelegram.power.instantaneous.power.positive.l1.unit = parsedLine.unit;
          break;

        // Instantaneous active power L2 (+P) in W resolution
        case '1-0:41.7.0':
          parsedTelegram.power.instantaneous.power.positive.l2.value = parseFloat(parsedLine.value);
          parsedTelegram.power.instantaneous.power.positive.l2.unit = parsedLine.unit;
          break;

        // Instantaneous active power L3 (+P) in W resolution
        case '1-0:61.7.0':
          parsedTelegram.power.instantaneous.power.positive.l3.value = parseFloat(parsedLine.value);
          parsedTelegram.power.instantaneous.power.positive.l3.unit = parsedLine.unit;
          break;

        // Instantaneous active power L1 (-P) in W resolution
        case '1-0:22.7.0':
          parsedTelegram.power.instantaneous.power.negative.l1.value = parseFloat(parsedLine.value);
          parsedTelegram.power.instantaneous.power.negative.l1.unit = parsedLine.unit;
          break;

        // Instantaneous active power L2 (-P) in W resolution
        case '1-0:42.7.0':
          parsedTelegram.power.instantaneous.power.negative.l2.value = parseFloat(parsedLine.value);
          parsedTelegram.power.instantaneous.power.negative.l2.unit = parsedLine.unit;
          break;

        // Instantaneous active power L3 (-P) in W resolution
        case '1-0:62.7.0':
          parsedTelegram.power.instantaneous.power.negative.l3.value = parseFloat(parsedLine.value);
          parsedTelegram.power.instantaneous.power.negative.l3.unit = parsedLine.unit;
          break;

        /**
         * Device-Type
         *
         * The Smart Meter has 4 M-Bus interfaces which allow to connect external devices like a Gas, Thermal,
         * Water or slave Electricity meter. The Obis code of external devices starts with 0-n (where n is a number from 1 to 4)
         *
         * However, the way to correctly determine the type of external device that is connected to each M-Bus is very poorly documented.
         * At the moment only Gas meters are being installed by the grid companies as far as I know.
         * So we make the assumption that a gas meter is attached to M-Bus 1.
         */
        case '0-1:24.1.0':
        case '0-2:24.1.0':
        case '0-3:24.1.0':
        case '0-4:24.1.0':
          parsedTelegram.gas.deviceType = parsedLine.value;
          break;

        // Equipment identifier (Gas)
        // Equipment identifier (Thermal: Heat or Cold)
        // Equipment identifier (Water)
        case '0-1:96.1.0':
        case '0-2:96.1.0':
        case '0-3:96.1.0':
        case '0-4:96.1.0':
        case '0-1:96.1.1':
          parsedTelegram.gas.equipmentId = parsedLine.value;
          break;

        // Last 5-minute value (temperature converted), gas delivered to client in m3, including decimal values and capture time
        // Last 5-minute Meter reading Heat or Cold in 0,01 GJ and capture time
        // Last 5-minute Meter reading in 0,001 m3 and capture time
        // Last 5-minute Meter reading and capture time (e.g. slave E meter)
        case '0-1:24.2.1':
        case '0-2:24.2.1':
        case '0-3:24.2.1':
        case '0-4:24.2.1':
          // eslint-disable-next-line no-case-declarations
          const hourlyReading = parseHourlyReading(parsedLine.value);

          parsedTelegram.gas.timestamp = parseTimestamp(hourlyReading?.timestamp);
          parsedTelegram.gas.value = parseFloat(hourlyReading?.value || '0');
          parsedTelegram.gas.unit = hourlyReading?.unit || null;
          break;

        // Gas, probably BE
        case '0-1:24.2.3':
          // eslint-disable-next-line no-case-declarations
          const instantValue = parsedLine.value.substring(15, 9);

          // eslint-disable-next-line no-case-declarations
          const instantUnit = parsedLine.value.substring(25, 2) as TelegramUnit;

          parsedTelegram.gas.value = parseFloat(instantValue);
          parsedTelegram.gas.unit = instantUnit;
          break;

        // Valve position (Gas) (BE)
        case '0-1:24.4.0':
        case '0-2:24.4.0':
        case '0-3:24.4.0':
        case '0-4:24.4.0':
          parsedTelegram.gas.valvePosition = parsedLine.value;
          break;

        /*
         * DSMR 2.2 specific mappings
         */

        case '0-1:24.3.0':
          // eslint-disable-next-line no-case-declarations
          const split = parsedLine.value.split(')(');
          parsedTelegram.gas.timestamp = parseTimestamp(split[0]);
          parsedTelegram.gas.unit = split[5] as TelegramUnit;
          break;

        /*
         * DSMR 5.0 specific mappings
         */

        // Instantaneous voltage L1 in V resolution
        case '1-0:32.7.0':
          parsedTelegram.power.instantaneous.voltage.l1.value = parseInt(parsedLine.value);
          parsedTelegram.power.instantaneous.voltage.l1.unit = parsedLine.unit;
          break;

        // Instantaneous voltage L2 in V resolution
        case '1-0:52.7.0':
          parsedTelegram.power.instantaneous.voltage.l2.value = parseInt(parsedLine.value);
          parsedTelegram.power.instantaneous.voltage.l2.unit = parsedLine.unit;
          break;

        // Instantaneous voltage L3 in V resolution
        case '1-0:72.7.0':
          parsedTelegram.power.instantaneous.voltage.l3.value = parseInt(parsedLine.value);
          parsedTelegram.power.instantaneous.voltage.l3.unit = parsedLine.unit;
          break;

        /*
         * eMUCs 1.4 specific mappings
         */

        case '1-0:31.4.0':
          parsedTelegram.power.fuseThreshold.value = parseFloat(parsedLine.value);
          parsedTelegram.power.fuseThreshold.unit = 'A';
          break;

        /*
         * Handling anything not matched so far
         */

        default:
          // Due to a 'bug' in DSMR2.2 the gas reading value is put on a separate line, so we catch it here with a regex
          // Format of the line containing that reading is: "(012345.678)"
          if (line.match(/\([0-9]{5}\.[0-9]{3}\)/)) {
            parsedTelegram.gas.value = parseFloat(line.substring(1, 10));
          } else {
            console.error('Unable to parse line: ' + line);
          }
          break;
      }
    }
  }

  /*
   * DSMR 2.2 specific logic
   */

  // If we could not find a version number we assume it's DSMR version 2.2 and add server timestamp, since these are not contained in the packet
  if (parsedTelegram.version === null) {
    parsedTelegram.version = '22';

    // Take the current time but ignore the milliseconds
    const now = new Date();
    now.setMilliseconds(0);
    parsedTelegram.timestamp = now.toISOString();
  }

  return parsedTelegram;
}

export function getMeterBrandModelFromHeader(header: string): string[] {
  const [meterBrand, meterModel] = header.split('\\');

  return [meterBrand, meterModel];
}

/**
 * Parse a single line of format: obisCode(value*unit), example: 1-0:2.8.1(123456.789*kWh)
 */
export function parseLine(line: string): TelegramParsedLine {
  const output = {} as TelegramParsedLine;
  const split = line.split(/\((.+)?/); // Split only on first occurrence of "("

  if (split[0] && split[1]) {
    const value = split[1].substring(0, split[1].length - 1);

    output.obisCode = split[0];

    if (value.indexOf('*') > -1 && value.indexOf(')(') === -1) {
      output.value = value.split('*')[0];
      output.unit = value.split('*')[1] as TelegramUnit;
    } else {
      output.value = value;
    }
  }

  return output;
}

/**
 * Parse timestamp of format: YYMMDDhhmmssX
 */
export function parseTimestamp(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;

  const parsedTimestamp = new Date();

  parsedTimestamp.setUTCFullYear(parseInt(timestamp.substring(0, 2)) + 2000);
  parsedTimestamp.setUTCMonth(parseInt(timestamp.substring(2, 4)) - 1);
  parsedTimestamp.setUTCDate(parseInt(timestamp.substring(4, 6)));
  parsedTimestamp.setUTCHours(parseInt(timestamp.substring(6, 8)));
  parsedTimestamp.setUTCMinutes(parseInt(timestamp.substring(8, 10)));
  parsedTimestamp.setUTCSeconds(parseInt(timestamp.substring(10, 12)));
  parsedTimestamp.setUTCMilliseconds(0);

  return formatISO(parsedTimestamp);
}

/**
 * Parse power failure event log of format: 1)(0-0:96.7.19)(timestamp end)(duration)(timestamp end)(duration...
 */
export function parsePowerFailureEventLog(value: string): TelegramPowerFailureLog {
  const split = value.split(')(0-0:96.7.19)(');

  const output = {
    count: parseInt(split[0]) || 0,
    log: [] as TelegramPowerFailureLogItem[],
  };

  if (split[1]) {
    const log = split[1].split(')(');

    // Loop the log structure: timestamp)(duration)(timestamp)(duration...
    for (let i = 0; i <= log.length; i = i + 2) {
      if (log[i] && log[i + 1]) {
        const endOfFailure = parseTimestamp(log[i]);
        const duration = parseInt(log[i + 1].split('*')[0]);
        const startOfFailure = endOfFailure
          ? subtractNumberOfSecondsFromDate(endOfFailure, duration)
          : null;

        const logEntry = {
          startOfFailure,
          endOfFailure: parseTimestamp(log[i]),
          duration,
          unit: log[i + 1].split('*')[1],
        } as TelegramPowerFailureLogItem;

        output.log.push(logEntry);
      }
    }
  }

  return output;
}

/**
 * Parse hourly readings, which is used for gas, water, heat, cold and slave electricity meters (DSMR 4.0+)
 */
export function parseHourlyReading(reading: string | null): TelegramHourlyReading | null {
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

/**
 * Subtract a number of seconds from a date and return the result as ISO string.
 */
export function subtractNumberOfSecondsFromDate(
  date: string | number | Date,
  seconds: number,
): string {
  const output = new Date(date);
  output.setSeconds(output.getSeconds() - seconds);

  return formatISO(output);
}

/**
 * Convert a hexadecimal encoded string to readable ASCII characters (e.g. 0x414243 -> ABC)
 */
export function convertHexToAscii(hex: string): string {
  if (!(typeof hex === 'number' || typeof hex == 'string')) {
    return '';
  }

  hex = hex.toString().replace(/\s+/gi, '');

  const stack = [];

  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substring(i, i + 2), 16);
    if (!isNaN(code) && code !== 0) {
      stack.push(String.fromCharCode(code));
    }
  }

  const ascii = stack.join('');

  return ascii;
}

// Credits to https://github.com/ruudverheijden/node-p1-reader for the initial idea.
// This code is based on that code, but has been heavily modified to support Typescript and to be more readable.
