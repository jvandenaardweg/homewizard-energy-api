/**
 * We can discover devices on the local network using the `_hwenergy._tcp` domain.
 *
 * The Bonjour service we use in our plugin only needs `hwenergy` and use the option `protocol: 'tcp'`.
 *
 * @link: https://homewizard-energy-api.readthedocs.io/discovery.html#discovery
 */
export const MDNS_DISCOVERY_TYPE = 'hwenergy';
export const MDNS_DISCOVERY_PROTOCOL = 'tcp';
export const MDNS_DISCOVERY_DOMAIN = `_${MDNS_DISCOVERY_TYPE}._${MDNS_DISCOVERY_PROTOCOL}.local`; // _hwenergy._tcp.local

/**
 * A list of device types that HomeWizard supports.
 *
 * The supported devices are listed below. The device type is used as identifier within the API.
 *
 * @link https://homewizard-energy-api.readthedocs.io/getting-started.html#supported-devices
 */
export const SupportedDevicesList = [
  'HWE-P1',
  'HWE-SKT',
  'HWE-WTR',
  'SDM230-wifi',
  'SDM630-wifi',
] as const;

export type SupportedDevices = typeof SupportedDevicesList[number];

export interface MdnsTxtRecord {
  /** Indicates if the "Local API" is enabled. `"1"` = enabled, `"0"` = disabled */
  api_enabled: string;
  /** The path to the API. Example: `"/api/v1"` */
  path: string;
  /** The serial number of the device. Example: `"3c12e7659852"`. This is also a the Mac address of the device. */
  serial: string;
  /** The product name of this device. Example: `"Energy Socket"` */
  product_name: string;
  /** A device type identifier. Example: `"HWE-SKT"` */
  product_type: SupportedDevices;
}

/**
 * The /api/v1/state endpoint returns the actual state of the Energy Socket. This endpoint is only available for the HWE-SKT.
 *
 * This response tells that the socket is ‘on’, switch-lock is ‘off’ and the brightness of the LED ring is set to maximum.
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#state-api-v1-state
 */
export interface StateResponse {
  /** The state of the switch. Returns true when the relay is in the ‘on’ state */
  power_on: boolean;
  /** When set to true, the socket cannot be turned off. */
  switch_lock: boolean;
  /** Brightness of LED ring when socket is ‘on’. Value from 0 (0%) to 255 (100%) */
  brightness: number;
}

export type StatePutParams<Keys extends keyof StateResponse> = Pick<StateResponse, Keys>;

/**
 * The /api endpoint allows you to get basic information from the device.
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api
 * @link: https://homewizard-energy-api.readthedocs.io/getting-started.html#supported-devices
 */
export interface BasicInformationResponse {
  /** The product type, see Supported devices. Make sure your application can handle other values for future products. Supported devices: https://homewizard-energy-api.readthedocs.io/getting-started.html#supported-devices */
  product_type: SupportedDevices;
  /** A fixed, user-friendly name. This name is not the same that is set by the user in the app. */
  product_name: string;
  /** Serial, also the MAC address. Consists of 12 hexadecimal values. */
  serial: string;
  /** The current firmware version. Make sure your application can handle other version formats. See Versioning and updates */
  firmware_version: string;
  /** The current api version, currently ‘v1’ */
  api_version: string;
}
/**
 * The /api/v1/data endpoint allows you to get the most recent measurement from the device.
 *
 * This response type only relates to the Energy Socket.
 *
 * All datapoints are “optional”; The API does not send datapoints that are null. Make sure your application can handle this.
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data
 */

export interface DataResponse {
  /** The DSMR version of the smart meter. Available for: `HWE-P1` */
  smr_version?: number;
  /** The brand indification the smart meter. Available for: `HWE-P1` */
  meter_model?: string;
  /**
   * The Wi-Fi network that the meter is connected to. Available for: `HWE-P1`, `HWE-WTR`, `SDM630-wifi`, `SDM230-wifi`
   *
   * Note: docs says not available on `HWE-SKT`, but it is available on my HWE-SKT
   */
  wifi_ssid?: string;
  /**
   * The strength of the Wi-Fi signal in %. Available for: `HWE-P1`, `HWE-WTR`, `SDM630-wifi`, `SDM230-wifi`
   *
   * Note: docs says not available on `HWE-SKT`, but it is available on my HWE-SKT
   */
  wifi_strength?: number;
  /** The power usage meter reading for tariff 1 in kWh. Available for: `HWE-P1`, `SDM230-wifi`, `SDM630-wifi` */
  total_power_import_t1_kwh?: number;
  /** The power usage meter reading for tariff 2 in kWh. Available for: `HWE-P1` */
  total_power_import_t2_kwh?: number;
  /** The power feed-in meter reading for tariff 1 in kWh. Available: `HWE-P1`, `HWE-SKT`, `SDM230-wifi`, `SDM630-wifi` */
  total_power_export_t1_kwh?: number;
  /** The power feed-in meter reading for tariff 2 in kWh. Available for: HWE-P1 */
  total_power_export_t2_kwh?: number;
  /** The total active usage in Watts: Available for: `HWE-P1`, `HWE-SKT`, SDM230-wifi, `SDM630-wifi` */
  active_power_w?: number;
  /** The active usage for fase 1 in Watts. Abailable for: `HWE-P1`, `HWE-SKT`, SDM230-wifi, `SDM630-wifi` */
  active_power_l1_w?: number;
  /** The active usage for fase 2 in Watts. Available for: `HWE-P1`, `SDM630-wifi` */
  active_power_l2_w?: number;
  /** The active usage for fase 3 in Watts. Available for: `HWE-P1`, `SDM630-wifi`  */
  active_power_l3_w?: number;
  /** The gas meter reading in m3. Available for: `HWE-P1` */
  total_gas_m3?: number;
  /** The most recent gas update time stamp structured as YYMMDDhhmmss. Available for: `HWE-P1` */
  gas_timestamp?: number;
  /** Active water usage in liters per minute. Available for: `HWE-WTR` */
  active_liter_lpm?: number;
  /** Total water usage in cubic meters since installation. Available for: `HWE-WTR` */
  total_liter_m3?: number;
}

/**
 * API /data response for `HWE-SKT`
 */
export type EnergySocketDataResponse = Omit<
  DataResponse,
  | 'smr_version'
  | 'meter_model'
  | 'total_power_import_t2_kwh'
  | 'total_power_export_t2_kwh'
  | 'active_power_l2_w'
  | 'active_power_l3_w'
  | 'total_gas_m3'
  | 'gas_timestamp'
  | 'active_liter_lpm'
  | 'total_liter_m3'
>;

/**
 * API /data response for `HWE-P1`
 */
export type P1MeterDataResponse = Omit<DataResponse, 'active_liter_lpm' | 'total_liter_m3'>;

/**
 * API /data response for `HWE-WTR`
 */
export type WaterMeterDataResponse = Omit<
  DataResponse,
  | 'smr_version'
  | 'meter_model'
  | 'total_power_import_t1_kwh'
  | 'total_power_import_t2_kwh'
  | 'total_power_export_t1_kwh'
  | 'total_power_export_t2_kwh'
  | 'active_power_w'
  | 'active_power_l1_w'
  | 'active_power_l2_w'
  | 'active_power_l3_w'
  | 'total_gas_m3'
  | 'gas_timestamp'
>;

/**
 * API /data response for `SDM230-wifi`
 */
export type KwhMeter1PhaseResponse = Omit<
  DataResponse,
  | 'smr_version'
  | 'meter_model'
  | 'total_power_import_t2_kwh'
  | 'total_power_export_t2_kwh'
  | 'active_power_l2_w'
  | 'active_power_l3_w'
  | 'total_gas_m3'
  | 'gas_timestamp'
  | 'active_liter_lpm'
  | 'total_liter_m3'
>;

/**
 * API /data response for `SDM630-wifi`
 */
export type KwhMeter3PhaseResponse = Omit<
  DataResponse,
  | 'smr_version'
  | 'meter_model'
  | 'total_power_import_t2_kwh'
  | 'total_power_export_t2_kwh'
  | 'active_power_l2_w'
  | 'active_power_l3_w'
  | 'total_gas_m3'
  | 'gas_timestamp'
  | 'active_liter_lpm'
  | 'total_liter_m3'
>;

/**
 * The /api/v1/identify endpoint can be used to let the user identify the device. The status light will blink for a few seconds after calling this endpoint.
 *
 * This feature is currently only available for HWE-SKT running firmware version 3.00 or later.
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#identify-api-v1-identify
 */
export interface IdentifyResponse {
  identify: 'ok';
}

export interface ErrorResponse {
  error: {
    id: ErrorCodes;
    description: string;
  };
}

/**
 * The /api/v1/system endpoint can be used to configure system settings.
 * Currently the only available option it to turn on and off all cloud communication.
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system
 */
export interface SystemResponse {
  cloud_enabled: boolean;
}

export interface SystemPutParams {
  cloud_enabled: boolean;
}

/**
 * When you perform an invalid request or something went wrong, the API will respond with an error message.
 * You have to check if the HTTP status code returns 200 OK before parsing the result.
 * If you use an endpoint that returns JSON, you also will receive an object with some error information.
 *
 * @link: https://homewizard-energy-api.readthedocs.io/error-handling.html
 */
export enum ErrorCodes {
  BODY_CONTAINS_INVALID_JSON = 2,
  NO_DATA_IN_BODY = 5, // undocumented but received it
  INVALID_VALUE_FOR_PARAMETER = 7,
  PARAMETER_IS_NOT_MODIFIABLE = 8,
  REQUEST_TO_LONG = 201,
  API_DISABLED = 202,
  INTERNAL_ERROR = 901,
}
