import { BaseApi, BaseApiOptions, BasePolling, PollMethod } from '@/base-api';
import { BasicInformationResponse, P1MeterDataResponse, TelegramResponse } from '@/types';
import { ParsedTelegram, parseTelegram } from './utils/telegram';

export interface P1MeterPolling<TTelegramResponse extends TelegramResponse>
  extends BasePolling<P1MeterDataResponse> {
  getTelegram: PollMethod<TTelegramResponse>;
}

export class P1MeterApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends P1MeterDataResponse>(): Promise<T> {
    return super.getData();
  }
  startPolling(
    method: 'getData',
    apiMethod: <T extends P1MeterDataResponse>() => Promise<T>,
  ): Promise<void>;
  startPolling(
    method: 'getTelegram',
    apiMethod: <T extends TelegramResponse>() => Promise<T>,
  ): Promise<void>;
  startPolling(method: string, apiMethod: () => Promise<unknown>): Promise<void> {
    return super.startPolling(method, apiMethod);
  }

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);
  }

  protected get endpoints() {
    const { baseUrl } = this;

    return {
      ...super.endpoints,
      telegram: `${baseUrl}/api/${this.apiVersion}/telegram`,
    };
  }

  /**
   * Start polling your P1 Meter using a specific method.
   *
   * To start polling, call the `start()` method on the returned object.
   * The polling can be stopped by calling the `stop()` method.
   *
   * Supported methods: `getData`, `getTelegram`
   */
  get polling(): P1MeterPolling<TelegramResponse> {
    const getTelegram = 'getTelegram';

    return {
      ...super.polling,
      [getTelegram]: {
        start: () => super.startPolling(getTelegram, this.getTelegram.bind(this)),
        stop: () => super.stopPolling(getTelegram),
        on: super.on.bind(this),
      },
    };
  }

  /**
   * The /api/v1/telegram endpoint returns the most recent, valid telegram that was given by the P1 meter,
   * therefore this endpoint is only available for the HWE-P1.
   *
   * The telegram validated with its CRC, but not parsed in any form.
   *
   * Note that this endpoint returns plain text instead of formatted JSON, even when an error occours (see Error handling)
   *
   * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#p1-telegram-api-v1-telegram
   */
  async getTelegram<T extends TelegramResponse>(): Promise<T> {
    const url = this.endpoints.telegram;

    this.log(`Fetching telegram at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    // Telegram endpoint returns plain text
    const data = (await response.body.text()) as T;

    this.log(`Received telegram ${JSON.stringify(data)} from ${this.endpoints.telegram}`);

    return data;
  }

  /**
   * The /api/v1/telegram endpoint returns the most recent, valid telegram that was given by the P1 meter in a text format.
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
