import { BaseApi, BaseApiOptions, BasePolling } from '@/base-api';
import {
  BasicInformationResponse,
  IdentifyResponse,
  KwhMeter3PhaseDataResponse,
  SystemPutParams,
  SystemResponse,
} from '@/types';

export type KwhMeter3PhasePolling = BasePolling<KwhMeter3PhaseDataResponse>;

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
