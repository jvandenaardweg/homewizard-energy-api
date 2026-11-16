import * as endpoints from '../endpoints';
import { PlugInBatteryMeasurement, PlugInBatterySystem, PlugInBatterySystemUpdate } from '../types';
import { CommonTopics, IdentifiableDeviceSocket, WebSocketOptions } from '../websocket';
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
export class PlugInBattery extends Device<
  PlugInBatteryMeasurement,
  PlugInBatterySystem,
  PlugInBatterySystemUpdate,
  PlugInBatteryTopics,
  PlugInBatteryUpdates
> {
  openWebSocket(
    options?: WebSocketOptions,
  ): IdentifiableDeviceSocket<PlugInBatteryTopics, PlugInBatteryUpdates> {
    return super.openWebSocket(options) as IdentifiableDeviceSocket<
      PlugInBatteryTopics,
      PlugInBatteryUpdates
    >;
  }

  protected createWebSocket(options?: WebSocketOptions) {
    return new IdentifiableDeviceSocket<PlugInBatteryTopics, PlugInBatteryUpdates>(
      this.client.webSocketConnection(),
      options,
    );
  }

  /**
   * Blinks the status LED for a few seconds, so the user can find the device.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system#identify
   */
  identify(): Promise<void> {
    return endpoints.identify(this.client);
  }
}
