import { BaseApi, BaseApiOptions } from '@/base-api';
import { BasicInformationResponse, WaterMeterDataResponse } from '@/types';

export class WaterMeterApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends WaterMeterDataResponse>(): Promise<T> {
    return super.getData();
  }

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);
  }
}
