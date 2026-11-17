import { EventEmitter } from 'events';
import { Dispatcher } from 'undici';
import { log, LoggerOptions } from '../shared/logger';
import { DEFAULT_POLL_INTERVAL, runPollLoop } from '../shared/poller';
import {
  DEFAULT_TIMEOUT,
  describeFailure,
  isResponseOk,
  parseJsonResponse,
  RequestParameters,
  requestWithTimeout,
} from '../shared/request';
import {
  createInvalidJsonError,
  createTimeoutError,
  HomeWizardEnergyApiResponseError,
} from './errors';
import {
  BasicInformationResponse,
  BaseDataResponse,
  IdentifyResponse,
  SystemPutParams,
  SystemResponse,
} from './types';

export {
  HomeWizardEnergyApiError,
  HomeWizardEnergyApiResponseError,
  HomeWizardEnergyApiTimeoutError,
} from './errors';
export type { LoggerOptions } from '../shared/logger';
export type { RequestParameters } from '../shared/request';

export interface PollingOptions {
  /**
   * The polling interval in milliseconds. Defaults to `1000`.
   *
   * There is no limit to the time between each request on the local API, however,
   * HomeWizard advises not to retrieve data more often than every `500`ms.
   *
   * @link https://api-documentation.homewizard.com/docs/getting-started#data-update-frequency
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

export type ApiVersion = 'v1' | undefined;

export interface ApiOptions {
  /** The API version to be used. Defaults to `v1`. */
  version?: ApiVersion;
}

export interface PollMethod<T> {
  start: () => void;
  stop: () => void;
  on(event: 'response', listener: (response: T) => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
}

export interface BasePolling<TDataResponse extends BaseDataResponse> {
  getData: PollMethod<TDataResponse>;
}

export interface BaseApiOptions {
  /** Options specific to the HomeWizard Energy API */
  api?: ApiOptions;
  /** Request options to be used in the HTTP request to the API */
  requestOptions?: RequestParameters[1];
  /**
   * The maximum time in milliseconds a request may take until the response headers arrive, including
   * connecting to the device. Defaults to `5000`. Set to `0` to disable it.
   *
   * When it's exceeded, the request throws a `HomeWizardEnergyApiTimeoutError`. It isn't used when
   * `requestOptions.signal` is set. Other network failures throw the error from `undici` as is.
   *
   * A connect that is still pending carries on in the background until undici's own connect timeout
   * of 10 seconds, which can keep a short script running that long after the error. To stop the
   * connect as well, pass a dispatcher with a matching connect timeout:
   *
   * @example
   * import { Agent } from 'undici';
   *
   * new P1MeterApi('http://192.168.1.35', {
   *   timeout: 3000,
   *   requestOptions: { dispatcher: new Agent({ connect: { timeout: 3000 } }) },
   * });
   */
  timeout?: number;
  /** Logging options */
  logger?: LoggerOptions;
  /** Polling options to request API endpoints at the given interval. */
  polling?: PollingOptions;
}

// 2 seconds, we are on a local network, so all request should be fast
export const DEFAULT_BODY_TIMEOUT = 2000;
export const DEFAULT_HEADERS_TIMEOUT = 2000;
export { DEFAULT_TIMEOUT } from '../shared/request';

export const DEFAULT_API_VERSION = 'v1';

export class BaseApi {
  protected readonly baseUrl: string;
  protected readonly apiOptions: BaseApiOptions['api'];
  protected readonly apiVersion: ApiVersion;
  protected requestOptions: BaseApiOptions['requestOptions'];
  protected loggerOptions: BaseApiOptions['logger'];
  protected pollingOptions: BaseApiOptions['polling'];
  protected timeout: number;
  protected eventEmitter: EventEmitter;

  /**
   * The active polling run per method, or `undefined` when the method isn't polling. Each start gets a new run,
   * so a loop from before a stop() can't continue after a quick start() again.
   */
  protected activePollingRuns: Record<string, object | undefined> = {};

  constructor(baseUrl: string, options?: BaseApiOptions) {
    // Endpoints start with a slash, so a trailing slash would request a path like //api/v1/data
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiOptions = options?.api;
    this.apiVersion = this.apiOptions?.version || DEFAULT_API_VERSION;
    this.requestOptions = {
      bodyTimeout: DEFAULT_BODY_TIMEOUT,
      headersTimeout: DEFAULT_HEADERS_TIMEOUT,
      // Allow user to overwrite the defaults
      ...options?.requestOptions,
    };

    this.timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    this.pollingOptions = options?.polling;

    this.loggerOptions = options?.logger;

    this.eventEmitter = new EventEmitter();
  }

  protected get endpoints() {
    const { baseUrl } = this;

    return {
      basic: `${baseUrl}/api`, // all products
      data: `${baseUrl}/api/${this.apiVersion}/data`, // all products
      identify: `${baseUrl}/api/${this.apiVersion}/identify`,
      system: `${baseUrl}/api/${this.apiVersion}/system`,
    };
  }

  protected on<T>(event: 'response', listener: (response: T) => void): void;
  protected on(event: 'error', listener: (error: Error) => void): void;
  // oxlint-disable-next-line typescript/no-explicit-any
  protected on(event: string, listener: (...args: any[]) => void) {
    return this.eventEmitter.on(event, listener);
  }

  /**
   * Returns the `on` method for `polling.<method>`, so its listeners only receive events from polling that method.
   */
  protected pollingOn<T>(method: string): PollMethod<T>['on'] {
    // oxlint-disable-next-line typescript/no-explicit-any
    return (event: 'response' | 'error', listener: (...args: any[]) => void) => {
      this.eventEmitter.on(`${method}:${event}`, listener);
    };
  }

  /**
   * Emits a polling event scoped to `method`. The unscoped event is also emitted for listeners added with `on()`,
   * but only when there are any, because an unhandled `error` event throws.
   */
  protected emitPollingEvent(method: string, event: 'response' | 'error', payload: unknown): void {
    this.eventEmitter.emit(`${method}:${event}`, payload);

    if (this.eventEmitter.listenerCount(event) > 0) {
      this.eventEmitter.emit(event, payload);
    }
  }

  protected async request(
    url: RequestParameters[0],
    options: RequestParameters[1],
  ): Promise<Dispatcher.ResponseData<unknown>> {
    return requestWithTimeout(
      url,
      { ...this.requestOptions, ...options },
      this.timeout,
      createTimeoutError,
    );
  }

  protected log(...args: unknown[]): void {
    return log(this.loggerOptions, ...args);
  }

  protected isResponseOk(response: Dispatcher.ResponseData<unknown>): boolean {
    return isResponseOk(response);
  }

  protected async throwResponseError(
    url: string,
    method: string,
    response: Dispatcher.ResponseData<unknown>,
  ): Promise<never> {
    const { statusCode, body } = response;
    const text = await body.text();

    throw new HomeWizardEnergyApiResponseError(
      describeFailure(method, url, statusCode, text),
      url,
      statusCode,
      text,
    );
  }

  /**
   * Reads the response body as JSON. A body that isn't valid JSON throws a `HomeWizardEnergyApiResponseError`
   * instead of a bare `SyntaxError`, so it has the URL and the raw body.
   */
  protected async parseJsonResponse<T>(
    url: string,
    method: string,
    response: Dispatcher.ResponseData<unknown>,
  ): Promise<T> {
    return parseJsonResponse<T>(url, method, response, createInvalidJsonError);
  }

  /**
   * Returns basic information from the device.
   *
   * Your application can use this endpoint to see if your integration is designed to work with this version of the API.
   * You can validate your support based on the combination of product_type and api_version.
   * Datapoints in this endpoint that are currently available won’t change, but make sure your application can accept new datapoints for future updates.
   *
   * @link https://api-documentation.homewizard.com/docs/v1/api
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

    const data = await this.parseJsonResponse<T>(url, method, response);

    this.log(`Fetched basic information: ${JSON.stringify(data)}`);

    return data;
  }

  /**
   * The /api/v1/data endpoint allows you to get the most recent measurement from the device.
   *
   * All datapoints are “optional”; The API does not send datapoints that are null. Make sure your application can handle this.
   *
   * @link https://api-documentation.homewizard.com/docs/v1/measurement
   */
  protected async getData<T extends BaseDataResponse>(): Promise<T> {
    const url = this.endpoints.data;

    this.log(`Fetching the data at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = await this.parseJsonResponse<T>(url, method, response);

    this.log(`Fetched data: ${JSON.stringify(data)}`);

    return data;
  }

  /**
   * The /api/v1/system endpoint can be used to configure system settings.
   * Currently the only available option is to turn on and off all cloud communication.
   *
   * With GET will send the actual system state.
   *
   * Available for: `HWE-P1`, `HWE-SKT`, `HWE-WTR`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`
   *
   * @link https://api-documentation.homewizard.com/docs/v1/system
   */
  protected async getSystem(): Promise<SystemResponse> {
    const url = this.endpoints.system;

    this.log(`Fetching system state at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = await this.parseJsonResponse<SystemResponse>(url, method, response);

    this.log(`Received system state ${JSON.stringify(data)} from ${url}`);

    return data;
  }

  /**
   * The /api/v1/system endpoint can be used to configure system settings.
   * Currently the only available option is to turn on and off all cloud communication.
   *
   * With PUT allows to set the system state.
   *
   * Available for: `HWE-P1`, `HWE-SKT`, `HWE-WTR`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`
   *
   * @link https://api-documentation.homewizard.com/docs/v1/system
   */
  protected async updateSystem(params: SystemPutParams): Promise<SystemResponse> {
    const url = this.endpoints.system;

    this.log(`Setting system state to ${JSON.stringify(params)} at ${url}`);

    const method = 'PUT';
    const response = await this.request(url, {
      method,
      body: JSON.stringify(params),
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = await this.parseJsonResponse<SystemResponse>(url, method, response);

    this.log(`Received updated system state ${JSON.stringify(data)} from ${url}`);

    return data;
  }

  /**
   * The /api/v1/identify endpoint can be used to let the user identify the device. The status light will blink for a few seconds after calling this endpoint.
   *
   * Available for: `HWE-P1`, `HWE-SKT`, `HWE-WTR`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`
   *
   * @link https://api-documentation.homewizard.com/docs/v1/identify
   */
  protected async identify(): Promise<IdentifyResponse> {
    const url = this.endpoints.identify;

    this.log(`Fetching identify at ${url}`);

    const method = 'PUT';

    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = await this.parseJsonResponse<IdentifyResponse>(url, method, response);

    this.log(`Device identified: ${JSON.stringify(data)}`);

    return data;
  }

  /**
   * Stops polling for a specific method.
   */
  protected stopPolling(method: string): void {
    if (!this.activePollingRuns[method]) {
      this.log(`Polling for "${method}" is not started or already stopped.`);
      return;
    }

    this.activePollingRuns[method] = undefined;

    this.log(`Stopping polling for "${method}".`);
  }

  /**
   * Start polling for a specific method.
   */
  get polling(): BasePolling<BaseDataResponse> {
    const getData = 'getData';

    return {
      [getData]: {
        start: () => {
          void this.startPolling(getData, this.getData.bind(this));
        },
        stop: () => this.stopPolling(getData),
        on: this.pollingOn(getData),
      },
    };
  }

  /**
   * Start polling for a specific method. This method will keep polling until the stop method is called.
   *
   * It will use the `interval` and `stopOnError` options from the polling options.
   *
   * Calling it while the method is already polling does nothing. The returned promise never rejects.
   */
  protected async startPolling(method: string, apiMethod: () => Promise<unknown>): Promise<void> {
    if (this.activePollingRuns[method]) {
      this.log(`Polling for "${method}" is already started.`);
      return;
    }

    const interval = this.pollingOptions?.interval || DEFAULT_POLL_INTERVAL;
    const stopOnError = !!this.pollingOptions?.stopOnError;

    const run = {};
    this.activePollingRuns[method] = run;

    return runPollLoop({
      name: method,
      interval,
      stopOnError,
      call: apiMethod,
      isActive: () => this.activePollingRuns[method] === run,
      stop: () => this.stopPolling(method),
      emit: (event, payload) => this.emitPollingEvent(method, event, payload),
      log: (...args) => this.log(...args),
    });
  }
}
