import { BaseApi, BaseApiOptions, BasePolling } from '@/v1/base-api';
import {
  BasicInformationResponse,
  IdentifyResponse,
  KwhMeter3PhaseDataResponse,
  SystemPutParams,
  SystemResponse,
} from '@/v1/types';

export type KwhMeter3PhasePolling = BasePolling<KwhMeter3PhaseDataResponse>;

/**
 * The 3-phase kWh meter (`HWE-KWH3`, `SDM630-wifi`) over the API v1.
 *
 * @deprecated Use `v2.KwhMeter3Phase`, over the API v2. HomeWizard no longer develops the API v1 and plans to remove it.
 * This class keeps working while the device has the API v1 enabled.
 *
 * @link https://api-documentation.homewizard.com/docs/changelog
 */
export class KwhMeter3PhaseApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends KwhMeter3PhaseDataResponse>(): Promise<T> {
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
    apiMethod: <T extends KwhMeter3PhaseDataResponse>() => Promise<T>,
  ): Promise<void> {
    return super.startPolling(method, apiMethod);
  }

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);
  }

  get polling(): KwhMeter3PhasePolling {
    return super.polling;
  }
}
