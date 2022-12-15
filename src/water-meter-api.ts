import { Base, HomeWizardEnergyApiOptions } from './base';
import { BasicInformationResponse, WaterMeterDataResponse } from './types';

export class WaterMeterApi extends Base {
  public getBasicInformation: () => Promise<BasicInformationResponse>;
  public getData: <T extends WaterMeterDataResponse>() => Promise<T>;

  constructor(baseUrl: string, options: HomeWizardEnergyApiOptions) {
    super(baseUrl, options);

    this.getBasicInformation = super.getBasicInformation;
    this.getData = super.getData;
  }
}
