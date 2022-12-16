import { BaseApi, BaseApiOptions } from './base';
import { BasicInformationResponse, KwhMeter3PhaseResponse } from './types';

export class KwhMeter3PhaseApi extends BaseApi {
  public getBasicInformation: () => Promise<BasicInformationResponse>;
  public getData: <T extends KwhMeter3PhaseResponse>() => Promise<T>;

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);

    this.getBasicInformation = super.getBasicInformation;
    this.getData = super.getData;
  }
}