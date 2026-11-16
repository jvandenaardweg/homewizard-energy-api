/*
 * The P1 telegram parser, at `homewizard-energy-api/telegram`. It turns the raw DSMR telegram from the P1 Meter
 * (`getTelegram()`) into a detailed object.
 */
export { parseTelegram } from './telegram';
export type {
  ParsedTelegram,
  TelegramHourlyReading,
  TelegramPeakDemand,
  TelegramPeakDemandHistory,
  TelegramPeakDemandHistoryItem,
  TelegramPowerFailureLog,
  TelegramPowerFailureLogItem,
  TelegramUnit,
  TelegramValueItem,
} from './telegram';
