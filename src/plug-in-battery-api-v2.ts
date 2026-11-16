import { BaseApiV2, BaseApiV2Options } from '@/base-api-v2';
import { BasePolling } from '@/base-api';
import { BasicInformationResponse } from '@/types';
import { PlugInBatteryMeasurementResponse, SystemV2PutParams, SystemV2Response } from '@/types-v2';

export type PlugInBatteryPollingV2 = BasePolling<PlugInBatteryMeasurementResponse>;

/**
 * The API v2 of the Plug-In Battery (`HWE-BAT`). This device only supports the API v2.
 *
 * The Plug-In Battery itself only exposes its measurements. To control the batteries (mode, permissions...)
 * use `getBatteries()` and `updateBatteries()` of the P1 Meter or kWh Meter that controls the batteries.
 *
 * Reboot is not available for safety reasons.
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class PlugInBatteryApiV2 extends BaseApiV2 {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends PlugInBatteryMeasurementResponse>(): Promise<T> {
    return super.getData();
  }
  getSystem(): Promise<SystemV2Response> {
    return super.getSystem();
  }
  /**
   * Only `status_led_brightness_pct` can be changed, `cloud_enabled` is always `true` and `api_v1_enabled` is not available.
   */
  updateSystem(
    params: Pick<SystemV2PutParams, 'status_led_brightness_pct'>,
  ): Promise<SystemV2Response> {
    return super.updateSystem(params);
  }
  identify(): Promise<void> {
    return super.identify();
  }

  constructor(baseUrl: string, options?: BaseApiV2Options) {
    super(baseUrl, options);
  }

  get polling(): PlugInBatteryPollingV2 {
    return super.polling;
  }
}
