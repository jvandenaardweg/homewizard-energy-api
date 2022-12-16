import { BaseApi, BaseApiOptions } from './base';
import { BasicInformationResponse, KwhMeter1PhaseResponse } from './types';

export class KwhMeter1PhaseApi extends BaseApi {
  public getBasicInformation: () => Promise<BasicInformationResponse>;
  public getData: <T extends KwhMeter1PhaseResponse>() => Promise<T>;

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);

    this.getBasicInformation = super.getBasicInformation;
    this.getData = super.getData;
  }
}
