import { BaseApi, HomeWizardEnergyApiError, BaseApiOptions } from './base';
import {
  BasicInformationResponse,
  EnergySocketDataResponse,
  IdentifyResponse,
  StatePutParams,
  StateResponse,
  SystemPutParams,
  SystemResponse,
} from './types';

export class EnergySocketApi extends BaseApi {
  public getBasicInformation: () => Promise<BasicInformationResponse>;
  public getData: <T extends EnergySocketDataResponse>() => Promise<T>;

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);

    this.getBasicInformation = super.getBasicInformation;
    this.getData = super.getData;
  }

  protected get endpoints() {
    const { baseUrl } = this;

    return {
      ...super.endpoints,
      state: `${baseUrl}/api/${this.apiVersion}/state`, // HWE-SKT
      identify: `${baseUrl}/api/${this.apiVersion}/identify`, // HWE-SKT
      system: `${baseUrl}/api/${this.apiVersion}/system`, // HWE-SKT
    };
  }

  /**
   * Returns the actual state of the Energy Socket. This endpoint is only available for the HWE-SKT.
   *
   * @link https://homewizard-energy-api.readthedocs.io/endpoints.html#state-api-v1-state
   */
  async getState(): Promise<StateResponse> {
    const url = this.endpoints.state;

    this.log(`Fetching the state at ${url}`);

    const method = 'GET';
    const response = await this.request(url, {
      method,
    });

    if (!this.isResponseOk(response)) {
      return this.throwResponseError(url, method, response);
    }

    const data = (await response.body.json()) as StateResponse;

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
   * With GET will send the actual system state
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
  async identify(firmwareVersion: number | null): Promise<IdentifyResponse> {
    if (!firmwareVersion) {
      throw new HomeWizardEnergyApiError(
        'Cannot identify this Energy Socket. The firmware version is not set.',
      );
    }

    // Check the required firmware version, otherwise we cannot identify the device
    if (firmwareVersion < 3) {
      throw new HomeWizardEnergyApiError(
        `Cannot identify this Energy Socket. Firmware version is ${firmwareVersion}. But the identify feature is only available on Energy Sockets with firmware version 3.00 or later.`,
      );
    }

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
