import { BaseApi, BaseApiOptions } from './base';
import { EnergySocketApi } from './energy-socket-api';
import { P1MeterApi } from './p1-meter-api';
import { WaterMeterApi } from './water-meter-api';

/**
 * HomeWizard Energy API
 *
 * @link: https://homewizard-energy-api.readthedocs.io
 */
export class HomeWizardEnergyApi extends BaseApi {
  public energySocket: EnergySocketApi;
  public p1Meter: P1MeterApi;
  public waterMeter: WaterMeterApi;

  constructor(baseUrl: string, options?: BaseApiOptions) {
    super(baseUrl, options);

    // TODO: Add support for multiple energy sockets
    this.energySocket = new EnergySocketApi(baseUrl, options);

    // TODO: add support for multiple P1 meters
    this.p1Meter = new P1MeterApi(baseUrl, options);

    // TODO: add support for multiple water meters
    this.waterMeter = new WaterMeterApi(baseUrl, options);
  }
}
