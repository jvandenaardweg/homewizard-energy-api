import { BaseApi, BaseApiOptions, BasePolling } from '@/base-api';
import { BasicInformationResponse, KwhMeter3PhaseDataResponse } from '@/types';

export type KwhMeter3PhasePolling = BasePolling<KwhMeter3PhaseDataResponse>;

export class KwhMeter3PhaseApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends KwhMeter3PhaseDataResponse>(): Promise<T> {
    return super.getData();
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
