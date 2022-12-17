import { BaseApi, BaseApiOptions } from '@/base-api';
import { BasicInformationResponse, KwhMeter1PhaseResponse } from '@/types';

export class KwhMeter1PhaseApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends KwhMeter1PhaseResponse>(): Promise<T> {
    return super.getData();
  }

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);

    this.getBasicInformation = super.getBasicInformation;
    this.getData = super.getData;
  }
}
