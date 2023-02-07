import { BaseApi, BaseApiOptions, BasePolling, PollMethod } from '@/base-api';
import {
  BasicInformationResponse,
  EnergySocketDataResponse,
  IdentifyResponse,
  StatePutParams,
  StateResponse,
  SystemPutParams,
  SystemResponse,
} from '@/types';

export interface EnergySocketPolling<TStateResponse extends StateResponse>
  extends BasePolling<EnergySocketDataResponse> {
  getState: PollMethod<TStateResponse>;
}

export class EnergySocketApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends EnergySocketDataResponse>(): Promise<T> {
    return super.getData();
  }
  protected startPolling(
    method: 'getData',
    apiMethod: <T extends EnergySocketDataResponse>() => Promise<T>,
  ): Promise<void>;
  protected startPolling(
    method: 'getState',
    apiMethod: <T extends StateResponse>() => Promise<T>,
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
      state: `${baseUrl}/api/${this.apiVersion}/state`, // HWE-SKT only
      identify: `${baseUrl}/api/${this.apiVersion}/identify`,
      system: `${baseUrl}/api/${this.apiVersion}/system`,
    };
  }

  /**
   * Start polling your Energy Socket using a specific method.
   *
   * To start polling, call the `start()` method on the returned object.
   * The polling can be stopped by calling the `stop()` method.
   *
   * Supported methods: `getData`, `getState`
   */
  get polling(): EnergySocketPolling<StateResponse> {
    const getState = 'getState';

    return {
      ...super.polling,
      [getState]: {
        start: () => super.startPolling(getState, this.getState.bind(this)),
        stop: () => super.stopPolling(getState),
        on: super.on.bind(this),
      },
    };
  }

  /**
   * Returns the actual state of the Energy Socket. This endpoint is only available for the HWE-SKT.
   *
   * @link https://homewizard-energy-api.readthedocs.io/endpoints.html#state-api-v1-state
   */
  async getState<T extends StateResponse>(): Promise<T> {
    const url = this.endpoints.state;

    this.log(`Fetching the state at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as T;

    this.log(`Received state ${JSON.stringify(data)} from ${this.endpoints.state}`);

    return data;
  }

  /**
   * Control the state of the Energy Socket. This endpoint is only available for the HWE-SKT.
   *
   * @link https://homewizard-energy-api.readthedocs.io/endpoints.html#state-api-v1-state
   */
  async updateState<Keys extends keyof StateResponse>(
    params: StatePutParams<Keys>,
  ): Promise<StatePutParams<Keys>> {
    const url = this.endpoints.state;

    this.log(`Setting the state to ${JSON.stringify(params)} at ${this.endpoints.state}`);

    const method = 'PUT';
    const response = await this.request(this.endpoints.state, {
      method,
      body: JSON.stringify(params),
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as StatePutParams<Keys>;

    this.log(`Received updated state ${JSON.stringify(data)} from ${this.endpoints.state}`);

    return data;
  }

  /**
   * The /api/v1/system endpoint can be used to configure system settings.
   * Currently the only available option it to turn on and off all cloud communication.
   *
   * With GET will send the actual system state.
   *
   * This feature is currently available for `HWE-P1` running firmware version 4.00 or later.
   * And `HWE-SKT`, `SDM230-wifi` and `SDM630-wifi` running firmware version 4.00 or later.
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
   * This feature is currently available for `HWE-P1` running firmware version 4.00 or later.
   * And `HWE-SKT`, `SDM230-wifi` and `SDM630-wifi` running firmware version 4.00 or later.
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
   * This feature is currently only available for HWE-SKT running firmware version 3.00 or later.
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
