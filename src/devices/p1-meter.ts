import * as endpoints from '../endpoints';
import {
  Batteries,
  BatteriesUpdate,
  P1MeterMeasurement,
  P1MeterSystem,
  P1MeterSystemUpdate,
} from '../types';
import { BatteriesTopic, CommonTopics, IdentifiableDeviceSocket } from '../websocket';
import { Device } from './device';

type P1MeterTopics = CommonTopics<P1MeterMeasurement, P1MeterSystem> & BatteriesTopic;
type P1MeterUpdates = { system: P1MeterSystemUpdate; batteries: BatteriesUpdate };

/**
 * The P1 Meter (`HWE-P1`) over the API v2.
 *
 * @example
 * import { pair, P1Meter } from 'homewizard-energy-api';
 *
 * // Once: pair, then store the credentials (host, token and identifier)
 * const credentials = await pair('192.168.1.35', 'my-app');
 *
 * const p1 = new P1Meter(credentials);
 * const measurement = await p1.getMeasurement();
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class P1Meter extends Device<{
  measurement: P1MeterMeasurement;
  system: P1MeterSystem;
  systemUpdate: P1MeterSystemUpdate;
  socket: IdentifiableDeviceSocket<P1MeterTopics, P1MeterUpdates>;
}> {
  protected readonly socketClass = IdentifiableDeviceSocket<P1MeterTopics, P1MeterUpdates>;

  /**
   * Blinks the status LED for a few seconds, so the user can find the device.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system#identify
   */
  identify(): Promise<void> {
    return endpoints.identify(this.client);
  }

  /**
   * Reboots the device. Usually not needed: when the user needs it often, they should contact HomeWizard support.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system#reboot
   */
  reboot(): Promise<void> {
    return endpoints.reboot(this.client);
  }

  /**
   * Returns the most recent valid telegram from the smart meter, unprocessed. Use `getMeasurement()` for parsed
   * values, or `parseTelegram()` to parse it yourself.
   *
   * Throws a `HomeWizardError` with code `telegram:no-telegram-received` when the meter sent no telegram.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/telegram
   */
  getTelegram(): Promise<string> {
    return endpoints.getTelegram(this.client);
  }

  /**
   * Returns the control system of the Plug-In Batteries that this P1 Meter controls.
   *
   * Firmware before API 2.1.0 has no batteries endpoint, and answers with a `response` error with status 404. Check
   * `isApiVersionAtLeast(device.api_version, '2.1.0')` first when you support older firmware.
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
