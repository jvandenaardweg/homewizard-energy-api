import { BaseApi, BaseApiOptions, BasePolling } from '@/base-api';
import { BasicInformationResponse, KwhMeter1PhaseDataResponse } from '@/types';

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

  get polling(): KwhMeter1PhasePolling {
    return super.polling;
  }
}
