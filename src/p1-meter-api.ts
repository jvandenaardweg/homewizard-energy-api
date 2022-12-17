import { BaseApi, BaseApiOptions, BasePolling } from '@/base-api';
import { BasicInformationResponse, P1MeterDataResponse } from '@/types';

export class P1MeterApi extends BaseApi {
  public getBasicInformation: <T extends BasicInformationResponse>() => Promise<T>;
  public getData: <T extends P1MeterDataResponse>() => Promise<T>;

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);

    this.getBasicInformation = super.getBasicInformation;
    this.getData = super.getData;
  }

  protected get endpoints() {
    const { baseUrl } = this;

    return {
      ...super.endpoints,
      telegram: `${baseUrl}/api/${this.apiVersion}/telegram`,
    };
  }

  get polling(): BasePolling<P1MeterDataResponse> {
    return {
      ...super.polling,
    };
  }

  async getTelegram(): Promise<string> {
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
    const data = (await response.body.text()) as string;

    this.log(`Received telegram ${JSON.stringify(data)} from ${this.endpoints.telegram}`);

    return data;
  }
}
