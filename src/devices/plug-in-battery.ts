import * as endpoints from '../endpoints';
import { PlugInBatteryMeasurement, PlugInBatterySystem, PlugInBatterySystemUpdate } from '../types';
import { CommonTopics, IdentifiableDeviceSocket } from '../websocket';
import { Device } from './device';

type PlugInBatteryTopics = CommonTopics<PlugInBatteryMeasurement, PlugInBatterySystem>;
type PlugInBatteryUpdates = { system: PlugInBatterySystemUpdate };

/**
 * The Plug-In Battery (`HWE-BAT`) over the API v2. It only has the API v2.
 *
 * It has no reboot (for safety), and `cloud_enabled` is read-only. The P1 Meter or kWh meter controls the
 * batteries: use their `getBatteries()` and `updateBatteries()`.
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class PlugInBattery extends Device<{
  measurement: PlugInBatteryMeasurement;
  system: PlugInBatterySystem;
  systemUpdate: PlugInBatterySystemUpdate;
  socket: IdentifiableDeviceSocket<PlugInBatteryTopics, PlugInBatteryUpdates>;
}> {
  protected readonly socketClass = IdentifiableDeviceSocket<
    PlugInBatteryTopics,
    PlugInBatteryUpdates
  >;

  /**
   * Blinks the status LED for a few seconds, so the user can find the device.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system#identify
   */
  identify(): Promise<void> {
    return endpoints.identify(this.client);
  }
}
