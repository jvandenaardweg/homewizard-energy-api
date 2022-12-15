import { Dispatcher, request as undiciRequest } from 'undici';
import { BasicInformationResponse, DataResponse } from './types';

type RequestParameters = Parameters<typeof undiciRequest>;

export class HomeWizardEnergyApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HomeWizardEnergyApiError';
  }
}
export class HomeWizardEnergyApiResponseError extends HomeWizardEnergyApiError {
  url: string;
  statusCode: number;
  response: string;

  constructor(message: string, url: string, statusCode: number, response: string) {
    super(message);
    this.name = 'HomeWizardEnergyApiResponseError';
    this.url = url;
    this.statusCode = statusCode;
    this.response = response;
  }
}

export interface HomeWizardEnergyApiOptions {
  /** The API version to be used. Defaults to `v1` */
  apiVersion?: 'v1' | undefined;
  /** Request options to be used in the HTTP request to the API. */
  requestOptions?: RequestParameters[1];
  logger?: (...args: unknown[]) => void;
}

export class Base {
  protected readonly baseUrl: string;
  protected readonly apiVersion: HomeWizardEnergyApiOptions['apiVersion'];
  protected requestOptions: HomeWizardEnergyApiOptions['requestOptions'];
  protected logger: HomeWizardEnergyApiOptions['logger'];

  constructor(baseUrl: string, options?: HomeWizardEnergyApiOptions) {
    this.baseUrl = baseUrl;
    this.apiVersion = options?.apiVersion || 'v1';
    this.requestOptions = {
      bodyTimeout: 1000, // 1 seconds, we are on a local network, so all request should be fast
      headersTimeout: 1000,
      // Allow user to overwrite the defaults
      ...options?.requestOptions,
    };

    this.logger = options?.logger;
  }

  protected get endpoints() {
    const { baseUrl } = this;

    return {
      basic: `${baseUrl}/api`, // all products
      data: `${baseUrl}/api/${this.apiVersion}/data`, // all products
    };
  }

  protected request(...params: RequestParameters) {
    return undiciRequest(params[0], {
      ...this.requestOptions,
      ...params[1],
    });
  }

  protected log(...args: unknown[]): void {
    if (!this.logger) return;

    return this.logger('[HomeWizard Energy API]: ', ...args);
  }

  protected isResponseOk(response: Dispatcher.ResponseData): boolean {
    return response.statusCode >= 200 && response.statusCode < 300;
  }

  protected async throwResponseError(
    url: string,
    method: string,
    response: Dispatcher.ResponseData,
  ): Promise<never> {
    const { statusCode, body } = response;
    const text = await body.text();

    throw new HomeWizardEnergyApiResponseError(
      `Api ${method} call at ${url} failed with status ${statusCode} and response data: ${text}`,
      url,
      statusCode,
      text,
    );
  }

  /**
   * Returns basic information from the device.
   *
   * Your application can use this endpoint to see if your integration is designed to work with this version of the API.
   * You can validate your support based on the combination of product_type and api_version.
   * Datapoints in this endpoint that are currently available won’t change, but make sure your application can accept new datapoints for future updates.
   *
   * @link https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api
   */
  protected async getBasicInformation(): Promise<BasicInformationResponse> {
    const url = this.endpoints.basic;

    this.log(`Fetching the basic information at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as BasicInformationResponse;

    this.log(`Fetched basic information: ${JSON.stringify(data)}`);

    return data;
  }

  protected async getData<T extends DataResponse>(): Promise<T> {
    const url = this.endpoints.data;

    this.log(`Fetching the data at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as T;

    this.log(`Fetched data: ${JSON.stringify(data)}`);

    return data;
  }
}
