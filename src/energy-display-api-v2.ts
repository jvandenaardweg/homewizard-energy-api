import { BaseApiV2, BaseApiV2Options } from '@/base-api-v2';
import { HomeWizardEnergyWebSocket } from '@/websocket-v2';
import { BasePolling } from '@/base-api';
import { BasicInformationResponse } from '@/types';
import { BaseMeasurementResponse, SystemV2PutParams, SystemV2Response } from '@/types-v2';

// TODO: replace by the datapoints of this device once the API v2 is documented for it
export type EnergyDisplayMeasurementResponse = BaseMeasurementResponse;

export type EnergyDisplayPollingV2 = BasePolling<EnergyDisplayMeasurementResponse>;

/**
 * The API v2 of the Energy Display (`HWE-DSP`). This device will only support the API v2.
 *
 * **The API v2 is still in development for this device.** HomeWizard did not document it yet, so this class only
 * contains what all devices with the API v2 have in common (authorization, device information, measurement, system and identify).
 * These common methods are expected to work the same way once the firmware supports the API v2, but this is not verified.
 *
 * TODO (not documented yet):
 * - the datapoints of the measurement (if any)
 * - everything specific to the display
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class EnergyDisplayApiV2 extends BaseApiV2 {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends EnergyDisplayMeasurementResponse>(): Promise<T> {
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

  get websocket(): HomeWizardEnergyWebSocket<EnergyDisplayMeasurementResponse> {
    return super.websocket as HomeWizardEnergyWebSocket<EnergyDisplayMeasurementResponse>;
  }

  get polling(): EnergyDisplayPollingV2 {
    return super.polling;
  }
}
