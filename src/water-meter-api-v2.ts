import { BaseApiV2, BaseApiV2Options } from '@/base-api-v2';
import { BasePolling } from '@/base-api';
import { BasicInformationResponse } from '@/types';
import { BaseMeasurementResponse, SystemV2PutParams, SystemV2Response } from '@/types-v2';

// TODO: replace by the datapoints of this device once the API v2 is documented for it
export type WaterMeterMeasurementResponse = BaseMeasurementResponse;

export type WaterMeterPollingV2 = BasePolling<WaterMeterMeasurementResponse>;

/**
 * The API v2 of the Watermeter (`HWE-WTR`).
 *
 * **The API v2 is still in development for this device.** HomeWizard did not document it yet, so this class only
 * contains what all devices with the API v2 have in common (authorization, device information, measurement, system and identify).
 * These common methods are expected to work the same way once the firmware supports the API v2, but this is not verified.
 *
 * TODO (not documented yet):
 * - the datapoints of the measurement (`total_liter_m3` and `active_liter_lpm` in the API v1)
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class WaterMeterApiV2 extends BaseApiV2 {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends WaterMeterMeasurementResponse>(): Promise<T> {
    return super.getData();
  }
  getSystem(): Promise<SystemV2Response> {
    return super.getSystem();
  }
  updateSystem(params: SystemV2PutParams): Promise<SystemV2Response> {
    return super.updateSystem(params);
  }
  identify(): Promise<void> {
    return super.identify();
  }

  constructor(baseUrl: string, options?: BaseApiV2Options) {
    super(baseUrl, options);
  }

  get polling(): WaterMeterPollingV2 {
    return super.polling;
  }
}
