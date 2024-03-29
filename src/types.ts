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
export const MDNS_DISCOVERY_QUERY_TYPE = 'PTR';

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

export type SupportedDevices = (typeof SupportedDevicesList)[number];

/**
 * The txt record of the mDNS discovery response.
 *
 * A discovery response contains some extra data that can be used to improve the setup in your application.
 *
 * @link: https://homewizard-energy-api.readthedocs.io/discovery.html#txt-records
 */
export interface MdnsTxtRecord {
  /** Indicates if the "Local API" is enabled. `"1"` = enabled, `"0"` = disabled */
  api_enabled: string;
  /** The path to the API. Can be used to validate that your application supports this device and API version. Example: `"/api/v1"` */
  path: string;
  /** The serial number of the device. Consists of 12 hexadecimal values. This is also a the Mac address of the device. Example: `"3c12e7659852"` */
  serial: string;
  /** The product name of this device. Example: `"Energy Socket"` */
  product_name: string;
  /** The product type, see Supported devices. Make sure your application can handle other values for future products. Example: `"HWE-SKT"` */
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
 * Some smart meters have more than one external device connected to it. This can be, for example, a gas and a water meter.
 * The external datapoint adds support for these devices.
 * Each entry is supplied with a set of data.
 *
 * See Example: HWE-P1 (3-phase, with gas, running 4.00 firmware)
 * for an example: https://homewizard-energy-api.readthedocs.io/endpoints.html#example-hwe-p1-3-phase-with-gas-running-4-00-firmware
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#external-datapoint
 */
export interface ExternalData {
  /** The unique identifier from the smart meter.` */
  unique_id?: string;
  /** The type of the device, can be `"gas_meter"`, `"heat_meter"`, `"warm_water_meter"`, `"water_meter"` or `"inlet_heat_meter"`. */
  type?: 'gas_meter' | 'heat_meter' | 'warm_water_meter' | 'water_meter' | 'inlet_heat_meter';
  /** The most recent value update time stamp structured as YYMMDDhhmmss. */
  timestamp?: number;
  /** The raw value */
  value?: number;
  /** The unit of the value, for example: `“m3”` or `“GJ”` */
  unit?: string;
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
export interface BaseDataResponse {
  /** The unique identifier from the smart meter. Available for: `HWE-P1` */
  unique_id?: string;
  /** The DSMR version of the smart meter. Available for: `HWE-P1` */
  smr_version?: number;
  /** The brand indification the smart meter. Available for: `HWE-P1` */
  meter_model?: string;
  /** The Wi-Fi network that the meter is connected to. Available for: `HWE-P1`, `HWE-WTR`, `SDM630-wifi`, `SDM230-wifi */
  wifi_ssid?: string;
  /** The strength of the Wi-Fi signal in %. Available for: `HWE-P1`, `HWE-WTR`, `SDM630-wifi`, `SDM230-wifi` */
  wifi_strength?: number;
  /** The power usage meter reading in kWh. Available for: `HWE-P1` */
  total_power_import_kwh?: number; // TODO: determine what this is, not in docs, but only found in example
  /** The power usage meter reading for tariff 1 in kWh. Available for: `HWE-P1`, `SDM230-wifi`, `SDM630-wifi` */
  total_power_import_t1_kwh?: number;
  /** The power usage meter reading for tariff 2 in kWh. Available for: `HWE-P1` */
  total_power_import_t2_kwh?: number;
  /** The power usage meter reading for tariff 3 in kWh. Available for: `HWE-P1` */
  total_power_import_t3_kwh?: number;
  /** The power usage meter reading for tariff 4 in kWh. Available for: `HWE-P1` */
  total_power_import_t4_kwh?: number;
  /** The power feed-in meter reading in kWh. Available for: `HWE-P1` */
  total_power_export_kwh?: number; // TODO: determine what this is, not in docs, but only found in example
  /** The power feed-in meter reading for tariff 1 in kWh. Available: `HWE-P1`, `HWE-SKT`, `SDM230-wifi`, `SDM630-wifi` */
  total_power_export_t1_kwh?: number;
  /** The power feed-in meter reading for tariff 2 in kWh. Available for: `HWE-P1` */
  total_power_export_t2_kwh?: number;
  /** The power feed-in meter reading for tariff 3 in kWh. Available for: `HWE-P1` */
  total_power_export_t3_kwh?: number;
  /** The power feed-in meter reading for tariff 4 in kWh. Available for: `HWE-P1` */
  total_power_export_t4_kwh?: number;
  /** The total active usage in Watts: Available for: `HWE-P1`, `HWE-SKT`, SDM230-wifi, `SDM630-wifi` */
  active_power_w?: number;
  /** The active usage for fase 1 in Watts. Abailable for: `HWE-P1`, `HWE-SKT`, SDM230-wifi, `SDM630-wifi` */
  active_power_l1_w?: number;
  /** The active usage for fase 2 in Watts. Available for: `HWE-P1`, `SDM630-wifi` */
  active_power_l2_w?: number;
  /** The active usage for fase 3 in Watts. Available for: `HWE-P1`, `SDM630-wifi`  */
  active_power_l3_w?: number;
  /** The active voltage for phase 1 in volt. Available for: `HWE-P1` */
  active_voltage_l1_v?: number;
  /** The active voltage for phase 2 in volt. Available for: `HWE-P1` */
  active_voltage_l2_v?: number;
  /** The active voltage for phase 3 in volt. Available for: `HWE-P1` */
  active_voltage_l3_v?: number;
  /** The active current for phase 1 in ampere. Available for: `HWE-P1` */
  active_current_l1_a?: number;
  /** The active current for phase 2 in ampere. Available for: `HWE-P1` */
  active_current_l2_a?: number;
  /** The active current for phase 3 in ampere. Available for: `HWE-P1` */
  active_current_l3_a?: number;
  /** Line frequency in hertz. Available for: `HWE-P1` */
  active_frequency_hz?: number;
  /** Number of voltage sags detected by meter for phase 1. Available for: `HWE-P1` */
  voltage_sag_l1_count?: number;
  /** Number of voltage sags detected by meter for phase 2. Available for: `HWE-P1` */
  voltage_sag_l2_count?: number;
  /** Number of voltage sags detected by meter for phase 3. Available for: `HWE-P1` */
  voltage_sag_l3_count?: number;
  /** Number of voltage swells detected by meter for phase 1. Available for: `HWE-P1` */
  voltage_swell_l1_count?: number;
  /** Number of voltage swells detected by meter for phase 2. Available for: `HWE-P1` */
  voltage_swell_l2_count?: number;
  /** Number of voltage swells detected by meter for phase 3. Available for: `HWE-P1` */
  voltage_swell_l3_count?: number;
  /** Number of power failures detected by meter. Available for: `HWE-P1` */
  any_power_fail_count?: number;
  /** Number of ‘long’ power failes detected by meter. Available for: `HWE-P1` */
  long_power_fail_count?: number;
  /** The active average demand. Available for: `HWE-P1` */
  active_power_average_w?: number;
  /** The peak average demand of this month. Available for: `HWE-P1` */
  montly_power_peak_w?: number;
  /** Timetamp when peak demand was registered, formatted as YYMMDDhhmmss. Available for: `HWE-P1` */
  montly_power_peak_timestamp?: number;
  /**
   * The gas meter reading in m3. Available for: `HWE-P1`
   *
   * @deprecated The gas meter reading in m3 for the first detected gas meter. Gas datapoints will be removed in favor of ‘external’ in a future software version, do not use this field in new implementations
   */
  total_gas_m3?: number;
  /** The most recent gas update time stamp structured as YYMMDDhhmmss. Available for: `HWE-P1` */
  gas_timestamp?: number;
  /** The unique identifier for the gas meter, can be used to migrate to the ‘external’ datapoint. Available for: `HWE-P1`  */
  gas_unique_id?: string;
  /** A list of externally connected utility meters, see External datapoint for more information. Available for: `HWE-P1` */
  external?: ExternalData[];
  /** Active water usage in liters per minute. Available for: `HWE-WTR` */
  active_liter_lpm?: number;
  /** Total water usage in cubic meters since installation. Available for: `HWE-WTR` */
  total_liter_m3?: number;
  /** The usage of this value is in development and should not be used. Available for: `HWE-WTR` */
  total_liter_offset_m3?: number;
  active_tariff?: number; // TODO: determine what this is, not in docs, but only found in example
}

/**
 * API /data response for `HWE-SKT`
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#datapoints-for-hwe-skt
 */
export type EnergySocketDataResponse = Pick<
  BaseDataResponse,
  | 'wifi_ssid'
  | 'wifi_strength'
  | 'total_power_import_t1_kwh'
  | 'total_power_export_t1_kwh'
  | 'active_power_w'
  | 'active_power_l1_w'
>;

/**
 * API /data response for `HWE-P1`
 */
export type P1MeterDataResponse = Omit<BaseDataResponse, 'active_liter_lpm' | 'total_liter_m3'>;

/**
 * API /data response for `HWE-WTR`
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#datapoints-for-hwe-wtr
 */
export type WaterMeterDataResponse = Pick<
  BaseDataResponse,
  'wifi_ssid' | 'wifi_strength' | 'total_liter_m3' | 'active_liter_lpm' | 'total_liter_offset_m3'
>;

/**
 * API /data response for `SDM230-wifi`
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#datapoints-for-sdm230-wifi-and-sdm630-wifi
 */
export type KwhMeter1PhaseDataResponse = Pick<
  BaseDataResponse,
  | 'wifi_ssid'
  | 'wifi_strength'
  | 'total_power_import_t1_kwh'
  | 'total_power_export_t1_kwh'
  | 'active_power_w'
  | 'active_power_l1_w'
>;

/**
 * API /data response for `SDM630-wifi`
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#datapoints-for-sdm230-wifi-and-sdm630-wifi
 */
export type KwhMeter3PhaseDataResponse = Pick<
  BaseDataResponse,
  | 'wifi_ssid'
  | 'wifi_strength'
  | 'total_power_import_t1_kwh'
  | 'total_power_export_t1_kwh'
  | 'active_power_w'
  | 'active_power_l1_w'
  | 'active_power_l2_w'
  | 'active_power_l3_w'
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
 * The /api/v1/telegram endpoint returns the most recent, valid telegram that was given by the P1 meter,
 * therefore this endpoint is only available for the HWE-P1.
 *
 * The telegram validated with its CRC, but not parsed in any form.
 *
 * Note that this endpoint returns plain text instead of formatted JSON, even when an error occours (see Error handling)
 *
 * @link: https://homewizard-energy-api.readthedocs.io/endpoints.html#p1-telegram-api-v1-telegram
 */
export type TelegramResponse = string;

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
