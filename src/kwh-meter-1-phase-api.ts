import { BaseApi, BaseApiOptions, BasePolling } from '@/base-api';
import {
  BasicInformationResponse,
  IdentifyResponse,
  KwhMeter1PhaseDataResponse,
  SystemPutParams,
  SystemResponse,
} from '@/types';

export type KwhMeter1PhasePolling = BasePolling<KwhMeter1PhaseDataResponse>;

/**
 * The 1-phase kWh meter (`HWE-KWH1`, `SDM230-wifi`) over the API v1.
 *
 * @deprecated Use `v2.KwhMeter1Phase`, over the API v2. HomeWizard no longer develops the API v1 and plans to remove it.
 * This class keeps working while the device has the API v1 enabled.
 *
 * @link https://api-documentation.homewizard.com/docs/changelog
 */
export class KwhMeter1PhaseApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends KwhMeter1PhaseDataResponse>(): Promise<T> {
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
    apiMethod: <T extends KwhMeter1PhaseDataResponse>() => Promise<T>,
  ): Promise<void> {
    return super.startPolling(method, apiMethod);
  }

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);
  }

  get polling(): KwhMeter1PhasePolling {
    return super.polling;
  }
}
