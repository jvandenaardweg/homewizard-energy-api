import { Base, HomeWizardEnergyApiOptions } from './base';
import { EnergySocketApi } from './energy-socket-api';
import { P1MeterApi } from './p1-meter-api';
import { WaterMeterApi } from './water-meter-api';

/**
 * HomeWizard Energy API
 *
 * @link: https://homewizard-energy-api.readthedocs.io
 */
export class HomeWizardEnergyApi extends Base {
  public energySocket: EnergySocketApi;
  public p1Meter: P1MeterApi;
  public waterMeter: WaterMeterApi;

  constructor(baseUrl: string, options: HomeWizardEnergyApiOptions) {
    super(baseUrl, options);

    this.energySocket = new EnergySocketApi(baseUrl, options);
    this.p1Meter = new P1MeterApi(baseUrl, options);
    this.waterMeter = new WaterMeterApi(baseUrl, options);
  }
}
