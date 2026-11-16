import * as endpoints from '../endpoints';
import {
  Batteries,
  BatteriesUpdate,
  KwhMeter1PhaseMeasurement,
  KwhMeter3PhaseMeasurement,
  KwhMeterSystem,
  KwhMeterSystemUpdate,
} from '../types';
import { BatteriesTopic, CommonTopics } from '../websocket';
import { Device } from './device';

/**
 * What both kWh meters have besides the common endpoints: reboot and the Plug-In Batteries. They have no identify
 * and no status LED setting.
 */
abstract class KwhMeter<TMeasurement> extends Device<
  TMeasurement,
  KwhMeterSystem,
  KwhMeterSystemUpdate,
  CommonTopics<TMeasurement, KwhMeterSystem> & BatteriesTopic
> {
  /**
   * Reboots the device. Usually not needed: when the user needs it often, they should contact HomeWizard support.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system#reboot
   */
  reboot(): Promise<void> {
    return endpoints.reboot(this.client);
  }

  /**
   * Returns the control system of the Plug-In Batteries that this kWh meter controls.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/batteries
   */
  getBatteries(): Promise<Batteries> {
    return endpoints.getBatteries(this.client);
  }

  /**
   * Changes the mode, permissions or `charge_to_full` of the Plug-In Batteries, and returns the new state.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/batteries
   */
  updateBatteries(params: BatteriesUpdate): Promise<Batteries> {
    return endpoints.updateBatteries(this.client, params);
  }
}

/**
 * The 1-phase kWh meter (`HWE-KWH1`, `SDM230-wifi`) over the API v2.
 *
 * To pair, hold the button of the kWh meter for 1 to 3 seconds.
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class KwhMeter1Phase extends KwhMeter<KwhMeter1PhaseMeasurement> {}

/**
 * The 3-phase kWh meter (`HWE-KWH3`, `SDM630-wifi`) over the API v2.
 *
 * To pair, hold the button of the kWh meter for 1 to 3 seconds.
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class KwhMeter3Phase extends KwhMeter<KwhMeter3PhaseMeasurement> {}
