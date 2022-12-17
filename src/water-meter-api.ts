import { BaseApi, BaseApiOptions } from '@/base-api';
import { BasicInformationResponse, WaterMeterDataResponse } from '@/types';

export class WaterMeterApi extends BaseApi {
  public getBasicInformation: <T extends BasicInformationResponse>() => Promise<T>;
  public getData: <T extends WaterMeterDataResponse>() => Promise<T>;

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);

    this.getBasicInformation = super.getBasicInformation;
    this.getData = super.getData;
  }
}
