import { BaseApi, BaseApiOptions, BasePolling, PollMethod } from '@/base-api';
import { BasicInformationResponse, P1MeterDataResponse, TelegramResponse } from '@/types';

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
}
