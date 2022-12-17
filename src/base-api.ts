import { EventEmitter } from 'events';
import { Dispatcher, request as undiciRequest } from 'undici';
import { BasicInformationResponse, DataResponse, StateResponse, TelegramResponse } from './types';

export type RequestParameters = Parameters<typeof undiciRequest>;

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

export interface PollingOptions {
  /**
   * The polling interval in milliseconds. Defaults to `1000`.
   *
   * There is no limit to the time between each request on the local API, however,
   * HomeWizard advises not to retrieve data more often than every `500`ms.
   *
   * @link: https://homewizard-energy-api.readthedocs.io/getting-started.html#data-update-frequency
   * */
  interval?: number;
  /**
   * When `true` will stop polling the API when a error occurs. Defaults to `false`.
   *
   * You can listen for an error using:
   *
   * @example
   * api.polling.getMethod.on('error', (error) => console.log(error)) */
  stopOnError?: boolean;
}

export interface LoggerOptions {
  method?: (...args: unknown[]) => void;
  prefix?: string;
}

export type ApiVersion = 'v1' | undefined;

export interface ApiOptions {
  version?: ApiVersion;
}

export interface PollMethod<T> {
  start: () => void;
  stop: () => void;
  on(event: 'response', listener: (response: T) => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
}

export interface BasePolling<TDataResponse extends DataResponse> {
  getData: PollMethod<TDataResponse>;
}

export interface BaseApiOptions {
  /** The API version to be used. Defaults to `v1` */
  api?: ApiOptions;
  /** Request options to be used in the HTTP request to the API. */
  requestOptions?: RequestParameters[1];
  logger?: LoggerOptions;
  polling?: PollingOptions;
}

export class BaseApi {
  protected readonly baseUrl: string;
  protected readonly apiOptions: BaseApiOptions['api'];
  protected readonly apiVersion: ApiVersion;
  protected requestOptions: BaseApiOptions['requestOptions'];
  protected loggerOptions: BaseApiOptions['logger'];
  protected pollingOptions: BaseApiOptions['polling'];
  protected eventEmitter: EventEmitter;

  protected isPolling: Record<string, boolean> = {};

  constructor(baseUrl: string, options?: BaseApiOptions) {
    this.baseUrl = baseUrl;
    this.apiOptions = options?.api;
    this.apiVersion = this.apiOptions?.version || 'v1';
    this.requestOptions = {
      bodyTimeout: 2000, // 2 seconds, we are on a local network, so all request should be fast
      headersTimeout: 2000,
      // Allow user to overwrite the defaults
      ...options?.requestOptions,
    };

    this.pollingOptions = options?.polling;

    this.loggerOptions = options?.logger;

    this.eventEmitter = new EventEmitter();
  }

  protected get endpoints() {
    const { baseUrl } = this;

    return {
      basic: `${baseUrl}/api`, // all products
      data: `${baseUrl}/api/${this.apiVersion}/data`, // all products
    };
  }

  protected on<T>(event: 'response', listener: (response: T) => void): void;
  protected on(event: 'error', listener: (error: Error) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected on(event: string, listener: (...args: any[]) => void) {
    return this.eventEmitter.on(event, listener);
  }

  protected request(...params: RequestParameters) {
    return undiciRequest(params[0], {
      ...this.requestOptions,
      ...params[1],
    });
  }

  protected log(...args: unknown[]): void {
    if (!this.loggerOptions?.method) return;

    const loggerPrefix = this.loggerOptions.prefix || '[HomeWizard Energy API]:';

    return this.loggerOptions.method(loggerPrefix, ...args);
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
  protected async getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    const url = this.endpoints.basic;

    this.log(`Fetching the basic information at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as T;

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

  protected stopPolling(method: string): void {
    if (!this.isPolling[method]) {
      this.log(`Polling for "${method}" is not started or already stopped.`);
      return;
    }

    this.isPolling[method] = false;

    this.log(`Stopping polling for "${method}".`);
  }

  /**
   * Start polling for a specific method.
   */
  get polling(): BasePolling<DataResponse> {
    const getData = 'getData';

    return {
      [getData]: {
        start: () => this.startPolling(getData, this.getData.bind(this)),
        stop: () => this.stopPolling(getData),
        on: this.on.bind(this),
      },
    };
  }

  protected async startPolling(
    method: string,
    apiMethod: <T extends DataResponse>() => Promise<T>,
  ): Promise<void>;
  protected async startPolling(
    method: string,
    apiMethod: <T extends StateResponse>() => Promise<T>,
  ): Promise<void>;
  protected async startPolling(
    method: string,
    apiMethod: <T extends TelegramResponse>() => Promise<T>,
  ): Promise<void>;
  protected async startPolling(
    method: string,
    apiMethod: <T extends DataResponse & StateResponse & TelegramResponse>() => Promise<T>,
  ): Promise<void> {
    const interval = this.pollingOptions?.interval || 1000;
    const stopOnError = !!this.pollingOptions?.stopOnError;

    this.isPolling[method] = true;

    while (this.isPolling[method]) {
      try {
        const response = await apiMethod();

        this.log(
          `Received response while polling "${method}". Emitting "response": ${JSON.stringify(
            response,
          )}`,
        );

        this.eventEmitter.emit('response', response);
      } catch (error) {
        this.log(`Received error while polling "${method}": ${JSON.stringify(error)}`);

        // If the user wants to stop polling on error, we stop polling
        if (stopOnError) {
          this.stopPolling(method);
          return;
        }

        this.eventEmitter.emit('error', error);
      } finally {
        this.log(`Waiting for next polling interval for "${method}"...`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }
}
