import { BaseApiV2, BaseApiV2Options, BatteriesPolling } from '@/base-api-v2';
import { BasePolling } from '@/base-api';
import { BasicInformationResponse } from '@/types';
import {
  BatteriesPutParams,
  BatteriesResponse,
  KwhMeter3PhaseMeasurementResponse,
  SystemV2PutParams,
  SystemV2Response,
} from '@/types-v2';

export interface KwhMeter3PhasePollingV2<TBatteriesResponse extends BatteriesResponse>
  extends BasePolling<KwhMeter3PhaseMeasurementResponse>,
    BatteriesPolling<TBatteriesResponse> {}

/**
 * The API v2 of the kWh Meter 3-phase (`HWE-KWH3` and `SDM630-wifi`).
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class KwhMeter3PhaseApiV2 extends BaseApiV2 {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends KwhMeter3PhaseMeasurementResponse>(): Promise<T> {
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
  reboot(): Promise<void> {
    return super.reboot();
  }
  getBatteries<T extends BatteriesResponse>(): Promise<T> {
    return super.getBatteries();
  }
  updateBatteries<T extends BatteriesResponse>(params: BatteriesPutParams): Promise<T> {
    return super.updateBatteries(params);
  }

  constructor(baseUrl: string, options?: BaseApiV2Options) {
    super(baseUrl, options);
  }

  /**
   * Start polling your kWh Meter using a specific method.
   *
   * Supported methods: `getData` and `getBatteries`
   */
  get polling(): KwhMeter3PhasePollingV2<BatteriesResponse> {
    const getBatteries = 'getBatteries';

    return {
      ...super.polling,
      [getBatteries]: {
        start: () => super.startPolling(getBatteries, this[getBatteries].bind(this)),
        stop: () => super.stopPolling(getBatteries),
        on: super.on.bind(this),
      },
    };
  }
}
