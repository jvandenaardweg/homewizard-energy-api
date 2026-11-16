import { BaseApiV2, BaseApiV2Options, BatteriesPolling } from '@/base-api-v2';
import { HomeWizardEnergyWebSocket } from '@/websocket-v2';
import { BasePolling } from '@/base-api';
import { BasicInformationResponse } from '@/types';
import {
  BatteriesPutParams,
  BatteriesResponse,
  KwhMeter1PhaseMeasurementResponse,
  SystemV2PutParams,
  SystemV2Response,
} from '@/types-v2';

export interface KwhMeter1PhasePollingV2<TBatteriesResponse extends BatteriesResponse>
  extends BasePolling<KwhMeter1PhaseMeasurementResponse>,
    BatteriesPolling<TBatteriesResponse> {}

/**
 * The API v2 of the kWh Meter 1-phase (`HWE-KWH1` and `SDM230-wifi`).
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export class KwhMeter1PhaseApiV2 extends BaseApiV2 {
  getBasicInformation<T extends BasicInformationResponse>(): Promise<T> {
    return super.getBasicInformation();
  }
  getData<T extends KwhMeter1PhaseMeasurementResponse>(): Promise<T> {
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

  get websocket(): HomeWizardEnergyWebSocket<KwhMeter1PhaseMeasurementResponse> {
    return super.websocket as HomeWizardEnergyWebSocket<KwhMeter1PhaseMeasurementResponse>;
  }

  /**
   * Start polling your kWh Meter using a specific method.
   *
   * Supported methods: `getData` and `getBatteries`
   */
  get polling(): KwhMeter1PhasePollingV2<BatteriesResponse> {
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
