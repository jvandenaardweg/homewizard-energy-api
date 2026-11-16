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
  getSystem(): Promise<SystemResponse> {
    return super.getSystem();
  }
  updateSystem(params: SystemPutParams): Promise<SystemResponse> {
    return super.updateSystem(params);
  }
  identify(): Promise<IdentifyResponse> {
    return super.identify();
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
        on: super.pollingOn(getState),
      },
    };
  }

  /**
   * Returns the actual state of the Energy Socket. This endpoint is only available for the HWE-SKT.
   *
   * @link https://api-documentation.homewizard.com/docs/v1/state
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

    const data = await this.parseJsonResponse<T>(url, method, response);

    this.log(`Received state ${JSON.stringify(data)} from ${this.endpoints.state}`);

    return data;
  }

  /**
   * Control the state of the Energy Socket. This endpoint is only available for the HWE-SKT.
   *
   * @link https://api-documentation.homewizard.com/docs/v1/state
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

    const data = await this.parseJsonResponse<StatePutParams<Keys>>(url, method, response);

    this.log(`Received updated state ${JSON.stringify(data)} from ${this.endpoints.state}`);

    return data;
  }
}
