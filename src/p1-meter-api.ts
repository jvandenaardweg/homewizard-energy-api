import { BaseApi, BaseApiOptions, BasePolling, PollMethod } from '@/base-api';
import {
  BasicInformationResponse,
  IdentifyResponse,
  P1MeterDataResponse,
  SystemPutParams,
  SystemResponse,
  TelegramResponse,
} from '@/types';
import { ParsedTelegram, parseTelegram } from './utils/telegram';

export interface P1MeterPolling<
  TTelegramResponse extends TelegramResponse,
  TParsedTelegram extends ParsedTelegram,
> extends BasePolling<P1MeterDataResponse> {
  getTelegram: PollMethod<TTelegramResponse>;
  getParsedTelegram: PollMethod<TParsedTelegram>;
}

export class P1MeterApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends P1MeterDataResponse>(): Promise<T> {
    return super.getData();
  }
  protected startPolling(
    method: 'getData',
    apiMethod: <T extends P1MeterDataResponse>() => Promise<T>,
  ): Promise<void>;
  protected startPolling(
    method: 'getTelegram',
    apiMethod: <T extends TelegramResponse>() => Promise<T>,
  ): Promise<void>;
  protected startPolling(
    method: 'getParsedTelegram',
    apiMethod: <T extends TelegramResponse>() => Promise<T>,
  ): Promise<void>;
  protected startPolling(method: string, apiMethod: () => Promise<unknown>): Promise<void> {
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
      identify: `${baseUrl}/api/${this.apiVersion}/identify`,
      system: `${baseUrl}/api/${this.apiVersion}/system`,
    };
  }

  /**
   * Start polling your P1 Meter using a specific method.
   *
   * To start polling, call the `start()` method on the returned object.
   * The polling can be stopped by calling the `stop()` method.
   *
   * Supported methods: `getData`, `getTelegram` and `getParsedTelegram`
   */
  get polling(): P1MeterPolling<TelegramResponse, ParsedTelegram> {
    const getTelegram = 'getTelegram';
    const getParsedTelegram = 'getParsedTelegram';

    return {
      ...super.polling,
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

  /**
   * The /api/v1/system endpoint can be used to configure system settings.
   * Currently the only available option it to turn on and off all cloud communication.
   *
   * With GET will send the actual system state.
   *
   * This feature is currently only available for HWE-P1 running firmware version 4.00 or later.
   *
   * @link https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system
   */
  async getSystem(): Promise<SystemResponse> {
    const url = this.endpoints.system;

    this.log(`Fetching system state at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as SystemResponse;

    this.log(`Received system state ${JSON.stringify(data)} from ${this.endpoints.system}`);

    return data;
  }

  /**
   * The /api/v1/system endpoint can be used to configure system settings.
   * Currently the only available option it to turn on and off all cloud communication.
   *
   * With PUT allows to set the system state.
   *
   * This feature is currently only available for HWE-P1 running firmware version 4.00 or later.
   *
   * @link https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system
   */
  async updateSystem(params: SystemPutParams): Promise<SystemResponse> {
    const url = this.endpoints.system;

    this.log(`Setting system state to ${JSON.stringify(params)} at ${this.endpoints.system}`);

    const method = 'PUT';
    const response = await this.request(this.endpoints.system, {
      method,
      body: JSON.stringify(params),
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as SystemResponse;

    this.log(`Received updated system state ${JSON.stringify(data)} from ${this.endpoints.system}`);

    return data;
  }

  /**
   * The /api/v1/identify endpoint can be used to let the user identify the device. The status light will blink for a few seconds after calling this endpoint.
   *
   * This feature is currently only available for HWE-P1 running firmware version 4.00 or later.
   *
   * @link https://homewizard-energy-api.readthedocs.io/endpoints.html#identify-api-v1-identify
   */
  async identify(): Promise<IdentifyResponse> {
    const url = this.endpoints.identify;

    this.log(`Fetching identify at ${url}`);

    const method = 'PUT';

    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as IdentifyResponse;

    this.log(`Energy Socket identified: ${JSON.stringify(data)}`);

    return data;
  }
}
