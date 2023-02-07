import { BaseApi, BaseApiOptions, BasePolling } from '@/base-api';
import {
  BasicInformationResponse,
  KwhMeter1PhaseDataResponse,
  SystemPutParams,
  SystemResponse,
} from '@/types';

export type KwhMeter1PhasePolling = BasePolling<KwhMeter1PhaseDataResponse>;

export class KwhMeter1PhaseApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends KwhMeter1PhaseDataResponse>(): Promise<T> {
    return super.getData();
  }
  protected startPolling(
    method: 'getData',
    apiMethod: <T extends KwhMeter1PhaseDataResponse>() => Promise<T>,
  ): Promise<void> {
    return super.startPolling(method, apiMethod);
  }

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);
  }

  protected get endpoints() {
    const { baseUrl } = this;

    return {
      ...super.endpoints,
      system: `${baseUrl}/api/${this.apiVersion}/system`,
    };
  }

  get polling(): KwhMeter1PhasePolling {
    return super.polling;
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
}
