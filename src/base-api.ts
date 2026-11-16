import { EventEmitter } from 'events';
import { Dispatcher, request as undiciRequest } from 'undici';
import {
  BasicInformationResponse,
  BaseDataResponse,
  ErrorResponse,
  IdentifyResponse,
  SystemPutParams,
  SystemResponse,
} from './types';

export type RequestParameters = Parameters<typeof undiciRequest>;

function parseApiError(response: string): ErrorResponse['error'] | undefined {
  try {
    const parsed = JSON.parse(response) as Partial<ErrorResponse> | null;
    const error = parsed?.error;

    if (typeof error?.id === 'number' && typeof error.description === 'string') {
      return error;
    }
  } catch {
    // Not a JSON error body
  }

  return undefined;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;

  return JSON.stringify(error);
}

export class HomeWizardEnergyApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HomeWizardEnergyApiError';
  }
}
export class HomeWizardEnergyApiResponseError extends HomeWizardEnergyApiError {
  url: string;
  statusCode: number;
  /** The raw response body. */
  response: string;
  /**
   * The parsed error when the response body is the API's JSON error object, for example
   * `{ id: ErrorCodes.INVALID_VALUE_FOR_PARAMETER, description: 'brightness value limited to 0-255' }`.
   * It is `undefined` for plain-text bodies, such as errors from `/api/v1/telegram`.
   *
   * @link https://api-documentation.homewizard.com/docs/v1/error-handling
   */
  apiError?: ErrorResponse['error'];

  constructor(message: string, url: string, statusCode: number, response: string) {
    super(message);
    this.name = 'HomeWizardEnergyApiResponseError';
    this.url = url;
    this.statusCode = statusCode;
    this.response = response;
    this.apiError = parseApiError(response);
  }
}

/**
 * Thrown when a request takes longer than the `timeout` option, for example when the device is unreachable.
 */
export class HomeWizardEnergyApiTimeoutError extends HomeWizardEnergyApiError {
  url: string;
  /** The timeout in milliseconds that was exceeded. */
  timeout: number;

  constructor(message: string, url: string, timeout: number) {
    super(message);
    this.name = 'HomeWizardEnergyApiTimeoutError';
    this.url = url;
    this.timeout = timeout;
  }
}

export interface PollingOptions {
  /**
   * The polling interval in milliseconds. Defaults to `1000`.
   *
   * There is no limit to the time between each request on the local API, however,
   * HomeWizard advises not to retrieve data more often than every `500`ms.
   *
   * @link: https://api-documentation.homewizard.com/docs/getting-started#data-update-frequency
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
  /** The log method to use. */
  method?: (...args: unknown[]) => void;
  /** The prefix that will show before the log. Defaults to `[HomeWizard Energy API]:` */
  prefix?: string;
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
// Covers connecting too, which undici otherwise allows 10 seconds for
export const DEFAULT_TIMEOUT = 5000;

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

  protected isPolling: Record<string, boolean> = {};
  protected pollingRuns: Record<string, number> = {};

  constructor(baseUrl: string, options?: BaseApiOptions) {
    this.baseUrl = baseUrl;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected on(event: string, listener: (...args: any[]) => void) {
    return this.eventEmitter.on(event, listener);
  }

  /**
   * Returns the `on` method for `polling.<method>`, so its listeners only receive events from polling that method.
   */
  protected pollingOn<T>(method: string): PollMethod<T>['on'] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  ): Promise<Dispatcher.ResponseData> {
    const requestOptions = {
      ...this.requestOptions,
      ...options,
    };

    const { timeout } = this;

    // A signal from the user takes precedence over the timeout
    if (!timeout || requestOptions.signal) {
      return undiciRequest(url, requestOptions);
    }

    // undici accepts an EventEmitter as signal, which works on every supported Node version
    const signal = new EventEmitter();
    let isTimedOut = false;

    const timer = setTimeout(() => {
      isTimedOut = true;
      signal.emit('abort');
    }, timeout);

    try {
      return await undiciRequest(url, { ...requestOptions, signal });
    } catch (error) {
      if (isTimedOut) {
        throw new HomeWizardEnergyApiTimeoutError(
          `Api ${requestOptions.method || 'GET'} call at ${url} timed out after ${timeout}ms`,
          String(url),
          timeout,
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
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

    const data = (await response.body.json()) as T;

    this.log(`Fetched basic information: ${JSON.stringify(data)}`);

    return data;
  }

  /**
   * The /api/v1/data endpoint allows you to get the most recent measurement from the device.
   *
   * All datapoints are “optional”; The API does not send datapoints that are null. Make sure your application can handle this.
   *
   * @link: https://api-documentation.homewizard.com/docs/v1/measurement
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

    const data = (await response.body.json()) as T;

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

    const data = (await response.body.json()) as SystemResponse;

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

    const data = (await response.body.json()) as SystemResponse;

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

    const data = (await response.body.json()) as IdentifyResponse;

    this.log(`Device identified: ${JSON.stringify(data)}`);

    return data;
  }

  /**
   * Stops polling for a specific method.
   */
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
  get polling(): BasePolling<BaseDataResponse> {
    const getData = 'getData';

    return {
      [getData]: {
        start: () => this.startPolling(getData, this.getData.bind(this)),
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
    if (this.isPolling[method]) {
      this.log(`Polling for "${method}" is already started.`);
      return;
    }

    const interval = this.pollingOptions?.interval || 1000;
    const stopOnError = !!this.pollingOptions?.stopOnError;

    // Each start gets its own run, so a loop from before a stop() can't continue after a quick start() again
    const run = (this.pollingRuns[method] || 0) + 1;
    this.pollingRuns[method] = run;
    this.isPolling[method] = true;

    const isCurrentRun = () => this.isPolling[method] && this.pollingRuns[method] === run;

    while (isCurrentRun()) {
      try {
        const response = await apiMethod();

        // Polling may have been stopped while the request was in flight
        if (!isCurrentRun()) return;

        this.log(
          `Received response while polling "${method}". Emitting "response": ${JSON.stringify(
            response,
          )}`,
        );

        this.emitPollingEvent(method, 'response', response);
      } catch (error) {
        if (!isCurrentRun()) return;

        this.log(`Received error while polling "${method}": ${formatError(error)}`);

        // If the user wants to stop polling on error, we stop polling
        if (stopOnError) {
          this.stopPolling(method);
        }

        try {
          this.emitPollingEvent(method, 'error', error);
        } catch (listenerError) {
          // A throwing "error" listener would otherwise reject this promise, which nothing awaits, and crash the process
          this.log(
            `An "error" listener for polling "${method}" threw: ${formatError(listenerError)}`,
          );
        }
      }

      if (!isCurrentRun()) return;

      this.log(`Waiting for next polling interval for "${method}"...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}
