import { BaseApiV2, BaseApiV2Options, BatteriesPolling } from '@/base-api-v2';
import { BasePolling, PollMethod } from '@/base-api';
import { BasicInformationResponse, TelegramResponse } from '@/types';
import {
  BatteriesPutParams,
  BatteriesResponse,
  P1MeterMeasurementResponse,
  SystemV2PutParams,
  SystemV2Response,
} from '@/types-v2';
import { ParsedTelegram, parseTelegram } from './utils/telegram';

export interface P1MeterPollingV2<
  TTelegramResponse extends TelegramResponse,
  TParsedTelegram extends ParsedTelegram,
  TBatteriesResponse extends BatteriesResponse,
> extends BasePolling<P1MeterMeasurementResponse>,
    BatteriesPolling<TBatteriesResponse> {
  getTelegram: PollMethod<TTelegramResponse>;
  getParsedTelegram: PollMethod<TParsedTelegram>;
}

/**
 * The API v2 of the P1 Meter (`HWE-P1`).
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class P1MeterApiV2 extends BaseApiV2 {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends P1MeterMeasurementResponse>(): Promise<T> {
    return super.getData();
  }
  getSystem(): Promise<SystemV2Response> {
    return super.getSystem();
  }
  updateSystem(params: SystemV2PutParams): Promise<SystemV2Response> {
    return super.updateSystem(params);
  }
  identify(): Promise<void> {
    return super.identify();
  }
  reboot(): Promise<void> {
    return super.reboot();
  }
  getBatteries<T extends BatteriesResponse>(): Promise<T> {
    return super.getBatteries();
  }
  updateBatteries<T extends BatteriesResponse>(params: BatteriesPutParams): Promise<T> {
    return super.updateBatteries(params);
  }
  getTelegram<T extends TelegramResponse>(): Promise<T> {
    return super.getTelegram();
  }

  constructor(baseUrl: string, options?: BaseApiV2Options) {
    super(baseUrl, options);
  }

  /**
   * Start polling your P1 Meter using a specific method.
   *
   * To start polling, call the `start()` method on the returned object.
   * The polling can be stopped by calling the `stop()` method.
   *
   * Supported methods: `getData`, `getBatteries`, `getTelegram` and `getParsedTelegram`
   */
  get polling(): P1MeterPollingV2<TelegramResponse, ParsedTelegram, BatteriesResponse> {
    const getBatteries = 'getBatteries';
    const getTelegram = 'getTelegram';
    const getParsedTelegram = 'getParsedTelegram';

    return {
      ...super.polling,
      [getBatteries]: {
        start: () => super.startPolling(getBatteries, this[getBatteries].bind(this)),
        stop: () => super.stopPolling(getBatteries),
        on: super.on.bind(this),
      },
      [getTelegram]: {
        start: () => super.startPolling(getTelegram, this[getTelegram].bind(this)),
        stop: () => super.stopPolling(getTelegram),
        on: super.on.bind(this),
      },
      [getParsedTelegram]: {
        start: () => super.startPolling(getParsedTelegram, this[getParsedTelegram].bind(this)),
        stop: () => super.stopPolling(getParsedTelegram),
        on: super.on.bind(this),
      },
    };
  }

  /**
   * The /api/telegram endpoint returns the most recent, valid telegram that was given by the P1 meter in a text format.
   *
   * This method fetches the telegram and parses it and returns it as a JSON object.
   */
  async getParsedTelegram<T extends ParsedTelegram>(): Promise<T> {
    const telegram = await this.getTelegram();

    const parsedTelegram = parseTelegram(telegram) as T;

    this.log(`Parsed telegram ${JSON.stringify(parsedTelegram)} from ${this.endpoints.telegram}`);

    return parsedTelegram;
  }
}
