import { BaseApi, BaseApiOptions, BasePolling } from '@/base-api';
import {
  BasicInformationResponse,
  IdentifyResponse,
  SystemPutParams,
  SystemResponse,
  WaterMeterDataResponse,
} from '@/types';

export type WaterMeterPolling = BasePolling<WaterMeterDataResponse>;

export class WaterMeterApi extends BaseApi {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends WaterMeterDataResponse>(): Promise<T> {
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
    apiMethod: <T extends WaterMeterDataResponse>() => Promise<T>,
  ): Promise<void> {
    return super.startPolling(method, apiMethod);
  }

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);
  }

  get polling(): WaterMeterPolling {
    return super.polling;
  }
}
