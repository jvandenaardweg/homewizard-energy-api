/**
 * The major API version this library speaks, sent in the `X-Api-Version` header.
 *
 * @link https://api-documentation.homewizard.com/docs/versioning
 */
export const API_MAJOR_VERSION = '2';

/**
 * The newest API version whose docs these types follow. A device on a newer 2.x version still works, but can send
 * fields the types don't have yet.
 *
 * @link https://api-documentation.homewizard.com/docs/changelog
 */
export const DOCUMENTED_API_VERSION = '2.3.0';

/**
 * Devices with the API v2 announce `_homewizard._tcp` over mDNS. Devices with the API v1 announce `_hwenergy._tcp`,
 * and a device that has both announces both.
 *
 * @link https://api-documentation.homewizard.com/docs/discovery
 */
export const MDNS_DISCOVERY_TYPE = 'homewizard'; // _homewizard._tcp.local

/**
 * The devices that have the API v2. The Energy Socket, Watermeter and Energy Display get it later.
 *
 * @link https://api-documentation.homewizard.com/docs/introduction#devices
 */
export const ProductTypeList = [
  'HWE-P1',
  'HWE-KWH1',
  'HWE-KWH3',
  'SDM230-wifi',
  'SDM630-wifi',
  'HWE-BAT',
] as const;

export type ProductType = (typeof ProductTypeList)[number];

/**
 * The txt record of a device on `_homewizard._tcp`.
 *
 * @link https://api-documentation.homewizard.com/docs/discovery#_homewizard_tcp
 */
export interface MdnsTxtRecord {
  /** The latest API version of the device. Example: `"2.2.0"` Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  api_version: string;
  /**
   * The identifier the device's certificate is issued to, formatted as `appliance/<product type>/<serial>`.
   * Anyone on the network can announce a device, so compare it with the identifier you stored at pairing instead
   * of passing it as the `identifier` option. Example: `"appliance/p1dongle/5c2fafaabbcc"`
   *
   * Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT`
   */
  id: string;
  /** The serial number, also the MAC address. 12 hexadecimal characters. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  serial: string;
  /** A user-friendly name that may change at any time. Example: `"P1 Meter"` Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  product_name: string;
  /** The product type. Your application should handle other values for future products. Example: `"HWE-P1"` Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  product_type: ProductType | (string & {});
}

/**
 * The error codes of the API v2. Upstream may add codes, so handle other values too.
 *
 * `json:parameter-invalid-type:<parameter>` and `json:parameter-missing:<parameter>` end with the parameter name.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/error-handling
 */
export type ErrorCode =
  | 'request:invalid-json'
  | 'json:no-parameters-recognized'
  | `json:parameter-invalid-type:${string}`
  | `json:parameter-missing:${string}`
  | 'json:parameter-not-exclusive'
  | 'request:api-version-not-supported'
  | 'request:internal-server-error'
  | 'request:too-large'
  | 'request:unknown-subscription'
  | 'request:unknown-type'
  | 'telegram:no-telegram-received'
  /** User creation is not enabled: the button on the device has not been pressed (yet). */
  | 'user:creation-not-enabled'
  | 'user:invalid-prefix'
  | 'user:name-empty'
  | 'user:name-invalid'
  | 'user:name-too-long'
  | 'user:no-storage'
  | 'user:not-found'
  | 'user:unauthorized'
  | (string & {});

/**
 * The body of an error response from a JSON endpoint.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/error-handling
 */
export interface ErrorResponse {
  error: ErrorCode;
}

/**
 * The response of `GET /api`.
 *
 * Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/device_information
 */
export interface DeviceInformation {
  /** A fixed, user-friendly name. Not the name the user set in the app. Example: `"P1 Meter"` Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  product_name: string;
  /** The product type. Your application should handle other values for future products. Example: `"HWE-P1"` Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  product_type: ProductType | (string & {});
  /** The serial number, also the MAC address. 12 hexadecimal characters. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  serial: string;
  /** The firmware version. Make sure your application can handle other formats. Example: `"6.00"` Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  firmware_version: string;
  /** The API version of the device. Example: `"2.2.0"` Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  api_version: string;
}

/**
 * The prefix of users created with the local API. Users the HomeWizard cloud created start with `cloud/`.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#local-and-cloud-users
 */
export const LOCAL_USER_PREFIX = 'local/';

/**
 * The name of a user without its `local/` prefix: 1 to 40 characters of `a-z`, `A-Z`, `0-9`, `-`, `_`, `\`, `/`, `#` and spaces.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#parameters
 */
export const USER_NAME_PATTERN = /^[a-zA-Z0-9\-_/\\# ]{1,40}$/;

/**
 * The response of `POST /api/user`. Store the token: the device can't return it again.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#token
 */
export interface UserCreated {
  /** The name of the user, prefixed with `local/`. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  name: string;
  /** The token for the `Authorization: Bearer <token>` header. 32 characters of `A-F` and `0-9`. Keep it secret. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  token: string;
}

/**
 * An item of the response of `GET /api/user`.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#list-users
 */
export interface User {
  /** The name of the user, prefixed with `local/` or `cloud/`. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  name: string;
  /** `true` for the user whose token made the request. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  current?: boolean;
}

/**
 * A timestamp as the device sends it: ISO 8601 without a timezone, which the device doesn't know.
 * Example: `"2024-06-28T14:12:34"`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#timestamps
 */
export type Timestamp = string;

/**
 * A utility meter connected to the smart meter, such as a gas or water meter.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#external-devices
 */
export interface ExternalMeter {
  /** The unique identifier of this meter. Available for: `HWE-P1` */
  unique_id: string;
  /** The type of meter. Your application should handle other values. Available for: `HWE-P1` */
  type:
    | 'gas_meter'
    | 'heat_meter'
    | 'warm_water_meter'
    | 'water_meter'
    | 'inlet_heat_meter'
    | (string & {});
  /** When the meter sent this value. Available for: `HWE-P1` */
  timestamp: Timestamp;
  /** The raw value. Available for: `HWE-P1` */
  value: number;
  /** The unit of the value. Examples: `"m3"`, `"GJ"` Available for: `HWE-P1` */
  unit: string;
}

/**
 * The response of `GET /api/measurement` for the P1 Meter.
 *
 * All data points are optional: the device leaves out values that are `null` or not available, which mostly
 * depends on the connected smart meter.
 *
 * Available for: `HWE-P1`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#p1-meter-hwe-p1
 */
export interface P1MeterMeasurement {
  /** The unique identifier of the smart meter. Available for: `HWE-P1` */
  unique_id?: string;
  /** The DSMR version of the smart meter. Available for: `HWE-P1` */
  protocol_version?: number;
  /** The brand identification of the smart meter. Available for: `HWE-P1` */
  meter_model?: string;
  /** When the smart meter sent this measurement to the P1 Meter. Available for: `HWE-P1` */
  timestamp?: Timestamp;
  /** The active tariff, which matches one of the totals. Available for: `HWE-P1` */
  tariff?: number;
  /** The energy import meter reading for all tariffs in kWh. Available for: `HWE-P1` */
  energy_import_kwh?: number;
  /** The energy import meter reading for tariff 1 in kWh. Available for: `HWE-P1` */
  energy_import_t1_kwh?: number;
  /** The energy import meter reading for tariff 2 in kWh. Available for: `HWE-P1` */
  energy_import_t2_kwh?: number;
  /** The energy import meter reading for tariff 3 in kWh. Available for: `HWE-P1` */
  energy_import_t3_kwh?: number;
  /** The energy import meter reading for tariff 4 in kWh. Available for: `HWE-P1` */
  energy_import_t4_kwh?: number;
  /** The energy export meter reading for all tariffs in kWh. Available for: `HWE-P1` */
  energy_export_kwh?: number;
  /** The energy export meter reading for tariff 1 in kWh. Available for: `HWE-P1` */
  energy_export_t1_kwh?: number;
  /** The energy export meter reading for tariff 2 in kWh. Available for: `HWE-P1` */
  energy_export_t2_kwh?: number;
  /** The energy export meter reading for tariff 3 in kWh. Available for: `HWE-P1` */
  energy_export_t3_kwh?: number;
  /** The energy export meter reading for tariff 4 in kWh. Available for: `HWE-P1` */
  energy_export_t4_kwh?: number;
  /** The total active power in watt, the sum of all phases. Negative when exporting. Available for: `HWE-P1` */
  power_w?: number;
  /** The active power of phase 1 in watt. Negative when exporting. Available for: `HWE-P1` */
  power_l1_w?: number;
  /** The active power of phase 2 in watt. Negative when exporting. Available for: `HWE-P1` */
  power_l2_w?: number;
  /** The active power of phase 3 in watt. Negative when exporting. Available for: `HWE-P1` */
  power_l3_w?: number;
  /** The active voltage in volt. Available for: `HWE-P1` */
  voltage_v?: number;
  /** The active voltage of phase 1 in volt. Available for: `HWE-P1` */
  voltage_l1_v?: number;
  /** The active voltage of phase 2 in volt. Available for: `HWE-P1` */
  voltage_l2_v?: number;
  /** The active voltage of phase 3 in volt. Available for: `HWE-P1` */
  voltage_l3_v?: number;
  /** The active current in ampere, the sum of the absolute values of all phases. Available for: `HWE-P1` */
  current_a?: number;
  /** The active current of phase 1 in ampere. Negative when exporting. Available for: `HWE-P1` */
  current_l1_a?: number;
  /** The active current of phase 2 in ampere. Negative when exporting. Available for: `HWE-P1` */
  current_l2_a?: number;
  /** The active current of phase 3 in ampere. Negative when exporting. Available for: `HWE-P1` */
  current_l3_a?: number;
  /** The line frequency in hertz. Available for: `HWE-P1` */
  frequency_hz?: number;
  /** The number of voltage sags the meter detected on phase 1. Available for: `HWE-P1` */
  voltage_sag_l1_count?: number;
  /** The number of voltage sags the meter detected on phase 2. Available for: `HWE-P1` */
  voltage_sag_l2_count?: number;
  /** The number of voltage sags the meter detected on phase 3. Available for: `HWE-P1` */
  voltage_sag_l3_count?: number;
  /** The number of voltage swells the meter detected on phase 1. Available for: `HWE-P1` */
  voltage_swell_l1_count?: number;
  /** The number of voltage swells the meter detected on phase 2. Available for: `HWE-P1` */
  voltage_swell_l2_count?: number;
  /** The number of voltage swells the meter detected on phase 3. Available for: `HWE-P1` */
  voltage_swell_l3_count?: number;
  /** The number of power failures the meter detected. Available for: `HWE-P1` */
  any_power_fail_count?: number;
  /** The number of long power failures the meter detected. Available for: `HWE-P1` */
  long_power_fail_count?: number;
  /** The average demand of the current quarter-hour in watt, for meters with a capacity tariff (Belgium). Available for: `HWE-P1` */
  average_power_15m_w?: number;
  /** The peak average demand of this month in watt, for meters with a capacity tariff (Belgium). Available for: `HWE-P1` */
  monthly_power_peak_w?: number;
  /** When the peak demand of this month was registered, for meters with a capacity tariff (Belgium). Available for: `HWE-P1` */
  monthly_power_peak_timestamp?: Timestamp;
  /** The utility meters connected to the smart meter, such as gas and water meters. Available for: `HWE-P1` */
  external?: ExternalMeter[];
}

/**
 * The response of `GET /api/measurement` for the 1-phase kWh meters.
 *
 * Available for: `HWE-KWH1`, `SDM230-wifi`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#kwh-meter-1-phase-hwe-kwh1-and-sdm230-wifi
 */
export interface KwhMeter1PhaseMeasurement {
  /** The energy import meter reading in kWh. Available for: `HWE-KWH1`, `SDM230-wifi` */
  energy_import_kwh?: number;
  /** The energy export meter reading in kWh. Available for: `HWE-KWH1`, `SDM230-wifi` */
  energy_export_kwh?: number;
  /** The total active power in watt. Available for: `HWE-KWH1`, `SDM230-wifi` */
  power_w?: number;
  /** The active voltage in volt. Available for: `HWE-KWH1`, `SDM230-wifi` */
  voltage_v?: number;
  /** The active current in ampere. Available for: `HWE-KWH1`, `SDM230-wifi` */
  current_a?: number;
  /** The apparent current in ampere. Available for: `HWE-KWH1`, `SDM230-wifi` */
  apparent_current_a?: number;
  /** The reactive current in ampere. Available for: `HWE-KWH1`, `SDM230-wifi` */
  reactive_current_a?: number;
  /** The apparent power in volt-ampere. Available for: `HWE-KWH1`, `SDM230-wifi` */
  apparent_power_va?: number;
  /** The reactive power in volt-ampere reactive. Available for: `HWE-KWH1`, `SDM230-wifi` */
  reactive_power_var?: number;
  /** The power factor. Available for: `HWE-KWH1`, `SDM230-wifi` */
  power_factor?: number;
  /** The line frequency in hertz. Available for: `HWE-KWH1`, `SDM230-wifi` */
  frequency_hz?: number;
}

/**
 * The response of `GET /api/measurement` for the 3-phase kWh meters.
 *
 * Available for: `HWE-KWH3`, `SDM630-wifi`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#kwh-meter-3-phase-hwe-kwh3-and-sdm630-wifi
 */
export interface KwhMeter3PhaseMeasurement {
  /** The energy import meter reading in kWh. Available for: `HWE-KWH3`, `SDM630-wifi` */
  energy_import_kwh?: number;
  /** The energy export meter reading in kWh. Available for: `HWE-KWH3`, `SDM630-wifi` */
  energy_export_kwh?: number;
  /** The total active power in watt, the sum of all phases. Negative when exporting. Available for: `HWE-KWH3`, `SDM630-wifi` */
  power_w?: number;
  /** The active power of phase 1 in watt. Negative when exporting. Available for: `HWE-KWH3`, `SDM630-wifi` */
  power_l1_w?: number;
  /** The active power of phase 2 in watt. Negative when exporting. Available for: `HWE-KWH3`, `SDM630-wifi` */
  power_l2_w?: number;
  /** The active power of phase 3 in watt. Negative when exporting. Available for: `HWE-KWH3`, `SDM630-wifi` */
  power_l3_w?: number;
  /** The active voltage of phase 1 in volt. Available for: `HWE-KWH3`, `SDM630-wifi` */
  voltage_l1_v?: number;
  /** The active voltage of phase 2 in volt. Available for: `HWE-KWH3`, `SDM630-wifi` */
  voltage_l2_v?: number;
  /** The active voltage of phase 3 in volt. Available for: `HWE-KWH3`, `SDM630-wifi` */
  voltage_l3_v?: number;
  /** The active current in ampere, the sum of the absolute values of all phases. Available for: `HWE-KWH3`, `SDM630-wifi` */
  current_a?: number;
  /** The active current of phase 1 in ampere. Negative when exporting. Available for: `HWE-KWH3`, `SDM630-wifi` */
  current_l1_a?: number;
  /** The active current of phase 2 in ampere. Negative when exporting. Available for: `HWE-KWH3`, `SDM630-wifi` */
  current_l2_a?: number;
  /** The active current of phase 3 in ampere. Negative when exporting. Available for: `HWE-KWH3`, `SDM630-wifi` */
  current_l3_a?: number;
  /** The apparent current in ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  apparent_current_a?: number;
  /** The apparent current of phase 1 in ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  apparent_current_l1_a?: number;
  /** The apparent current of phase 2 in ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  apparent_current_l2_a?: number;
  /** The apparent current of phase 3 in ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  apparent_current_l3_a?: number;
  /** The reactive current in ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  reactive_current_a?: number;
  /** The reactive current of phase 1 in ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  reactive_current_l1_a?: number;
  /** The reactive current of phase 2 in ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  reactive_current_l2_a?: number;
  /** The reactive current of phase 3 in ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  reactive_current_l3_a?: number;
  /** The apparent power in volt-ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  apparent_power_va?: number;
  /** The apparent power of phase 1 in volt-ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  apparent_power_l1_va?: number;
  /** The apparent power of phase 2 in volt-ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  apparent_power_l2_va?: number;
  /** The apparent power of phase 3 in volt-ampere. Available for: `HWE-KWH3`, `SDM630-wifi` */
  apparent_power_l3_va?: number;
  /** The reactive power in volt-ampere reactive. Available for: `HWE-KWH3`, `SDM630-wifi` */
  reactive_power_var?: number;
  /** The reactive power of phase 1 in volt-ampere reactive. Available for: `HWE-KWH3`, `SDM630-wifi` */
  reactive_power_l1_var?: number;
  /** The reactive power of phase 2 in volt-ampere reactive. Available for: `HWE-KWH3`, `SDM630-wifi` */
  reactive_power_l2_var?: number;
  /** The reactive power of phase 3 in volt-ampere reactive. Available for: `HWE-KWH3`, `SDM630-wifi` */
  reactive_power_l3_var?: number;
  /** The power factor of phase 1. Available for: `HWE-KWH3`, `SDM630-wifi` */
  power_factor_l1?: number;
  /** The power factor of phase 2. Available for: `HWE-KWH3`, `SDM630-wifi` */
  power_factor_l2?: number;
  /** The power factor of phase 3. Available for: `HWE-KWH3`, `SDM630-wifi` */
  power_factor_l3?: number;
  /** The line frequency in hertz. Available for: `HWE-KWH3`, `SDM630-wifi` */
  frequency_hz?: number;
}

/**
 * The response of `GET /api/measurement` for the Plug-In Battery.
 *
 * Available for: `HWE-BAT`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#plug-in-battery-hwe-bat
 */
export interface PlugInBatteryMeasurement {
  /** The energy import (charge) meter reading in kWh. Available for: `HWE-BAT` */
  energy_import_kwh?: number;
  /** The energy export (discharge) meter reading in kWh. Available for: `HWE-BAT` */
  energy_export_kwh?: number;
  /** The total active power in watt. Available for: `HWE-BAT` */
  power_w?: number;
  /** The active voltage in volt. Available for: `HWE-BAT` */
  voltage_v?: number;
  /** The active current in ampere. Available for: `HWE-BAT` */
  current_a?: number;
  /** The line frequency in hertz. Available for: `HWE-BAT` */
  frequency_hz?: number;
  /** The state of charge in percent. Available for: `HWE-BAT` */
  state_of_charge_pct?: number;
  /** The number of battery cycles. Available for: `HWE-BAT` */
  cycles?: number;
}

/**
 * The response of `GET /api/system` and `PUT /api/system`.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/system
 */
export interface System {
  /** The SSID of the Wi-Fi network. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  wifi_ssid: string;
  /** The signal strength of the Wi-Fi network in dB. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  wifi_rssi_db: number;
  /** The uptime of the device in seconds. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT` */
  uptime_s: number;
  /**
   * Whether the device communicates with the HomeWizard cloud. Read-only and always `true` on the Plug-In Battery.
   *
   * Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT`
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system#cloud-communication
   */
  cloud_enabled: boolean;
  /**
   * The brightness of the status LED in percent.
   *
   * Available for: `HWE-P1`, `HWE-BAT`
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system#status-led-brightness
   */
  status_led_brightness_pct?: number;
  /**
   * Whether the API v1 is enabled. Optional, because it goes away when the API v1 is removed.
   *
   * Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system#enable-or-disable-the-v1-api
   */
  api_v1_enabled?: boolean;
}

/**
 * The system response of the P1 Meter.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/system
 */
export type P1MeterSystem = System & Required<Pick<System, 'status_led_brightness_pct'>>;
/**
 * The writable system settings of the P1 Meter.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/system
 */
export type P1MeterSystemUpdate = Partial<
  Pick<System, 'cloud_enabled' | 'status_led_brightness_pct' | 'api_v1_enabled'>
>;

/**
 * The system response of the kWh meters, which have no status LED setting.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/system
 */
export type KwhMeterSystem = Omit<System, 'status_led_brightness_pct'>;
/**
 * The writable system settings of the kWh meters.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/system
 */
export type KwhMeterSystemUpdate = Partial<Pick<System, 'cloud_enabled' | 'api_v1_enabled'>>;

/**
 * The system response of the Plug-In Battery, which only has the API v2.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/system
 */
export type PlugInBatterySystem = Omit<System, 'api_v1_enabled'> &
  Required<Pick<System, 'status_led_brightness_pct'>>;
/**
 * The writable system settings of the Plug-In Battery. `cloud_enabled` is read-only on this device.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/system
 */
export type PlugInBatterySystemUpdate = Partial<Pick<System, 'status_led_brightness_pct'>>;

/**
 * The control mode of the Plug-In Batteries.
 *
 * - `zero`: charge or discharge to keep the home at net zero. The default.
 * - `predictive`: choose the permissions from the predicted usage and energy prices. Needs the HomeWizard cloud. From API 2.3.0.
 * - `standby`: neither charge nor discharge. Legacy: use `permissions: []` instead.
 * - `to_full`: charge to 100%, then go back to `zero`. Legacy: use `charge_to_full: true` instead.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/batteries#mode
 */
export type BatteriesMode = 'zero' | 'predictive' | 'standby' | 'to_full' | (string & {});

/**
 * Whether the Plug-In Batteries may charge and discharge.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/batteries#permissions
 */
export type BatteriesPermission = 'charge_allowed' | 'discharge_allowed';

/**
 * The response of `GET /api/batteries` and `PUT /api/batteries`: the control system of the Plug-In Batteries,
 * which the P1 Meter or kWh meter runs.
 *
 * Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/batteries
 */
export interface Batteries {
  /** The control mode. From API 2.1.0; `predictive` from API 2.3.0. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi` */
  mode: BatteriesMode;
  /** Whether the batteries may charge and discharge. Read-only in mode `to_full`. From API 2.2.0. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi` */
  permissions?: BatteriesPermission[];
  /** `true` while all batteries charge to 100%. Replaces mode `to_full`. From API 2.3.0. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi` */
  charge_to_full?: boolean;
  /** The number of connected Plug-In Batteries. From API 2.2.0. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi` */
  battery_count?: number;
  /** The combined power of the batteries in watt. From API 2.1.0. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi` */
  power_w: number;
  /** The combined target power of the batteries in watt. From API 2.1.0. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi` */
  target_power_w: number;
  /** The maximum combined charge power in watt. From API 2.1.0. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi` */
  max_consumption_w: number;
  /** The maximum combined discharge power in watt. From API 2.1.0. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi` */
  max_production_w: number;
}

/**
 * The writable settings of `PUT /api/batteries`. `mode: 'to_full'` and `permissions` can't be set together.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/batteries
 */
export type BatteriesUpdate = Partial<Pick<Batteries, 'mode' | 'permissions' | 'charge_to_full'>>;
