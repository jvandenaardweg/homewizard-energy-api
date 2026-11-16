import { BaseApiV2, BaseApiV2Options } from '@/base-api-v2';
import { HomeWizardEnergyWebSocket } from '@/websocket-v2';
import { BasePolling } from '@/base-api';
import { BasicInformationResponse } from '@/types';
import { BaseMeasurementResponse, SystemV2PutParams, SystemV2Response } from '@/types-v2';

// TODO: replace by the datapoints of this device once the API v2 is documented for it
export type TemperatureHumidityMeterMeasurementResponse = BaseMeasurementResponse;

export type TemperatureHumidityMeterPollingV2 =
  BasePolling<TemperatureHumidityMeterMeasurementResponse>;

/**
 * The API v2 of the Temperature Humidity Meter (`HWE-TMP`).
 *
 * **This device has no local API yet.** HomeWizard does not plan the API v1 for it and is only exploring the API v2
 * (the device is always battery powered), so it might never be available. This class is a preparation: it only
 * contains what all devices with the API v2 have in common (authorization, device information, measurement, system and identify).
 * Nothing of this class is verified against a device.
 *
 * TODO (not documented yet):
 * - the datapoints of the measurement (temperature and humidity, probably the battery level)
 * - if the device can be reached at any time, a battery powered device is probably asleep most of the time
 * - the product type used in the certificate (see `CertificateProductTypes`)
 *
 * @link https://api-documentation.homewizard.com/docs/introduction
 */
export class TemperatureHumidityMeterApiV2 extends BaseApiV2 {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends TemperatureHumidityMeterMeasurementResponse>(): Promise<T> {
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

  get websocket(): HomeWizardEnergyWebSocket<TemperatureHumidityMeterMeasurementResponse> {
    return super
      .websocket as HomeWizardEnergyWebSocket<TemperatureHumidityMeterMeasurementResponse>;
  }

  get polling(): TemperatureHumidityMeterPollingV2 {
    return super.polling;
  }
}
