import { SupportedDevices } from './types';

/**
 * The value that needs to be sent in the `X-Api-Version` header to use the API v2.
 *
 * @link https://api-documentation.homewizard.com/docs/versioning
 */
export const API_V2_HEADER_VERSION = '2';

/**
 * In API v2 devices are discovered using the `_homewizard._tcp` domain.
 * The API v1 uses `_hwenergy._tcp`, a device can respond to both.
 *
 * @link https://api-documentation.homewizard.com/docs/discovery
 */
export const MDNS_DISCOVERY_TYPE_V2 = 'homewizard';
export const MDNS_DISCOVERY_DOMAIN_V2 = `_${MDNS_DISCOVERY_TYPE_V2}._tcp.local`; // _homewizard._tcp.local

/**
 * The txt record of the mDNS discovery response on `_homewizard._tcp` (API v2).
 *
 * @link https://api-documentation.homewizard.com/docs/discovery
 */
export interface MdnsTxtRecordV2 {
  /** The latest API version supported by the device. Example: `"2.0.0"` */
  api_version: string;
  /** The identifier of the device, used to validate the SSL certificate. Formatted as `appliance/<product_type>/<serial>`. Example: `"appliance/p1dongle/5c2fafaabbcc"` */
  id: string;
  /** The serial number of the device. Consists of 12 hexadecimal values. This is also a the Mac address of the device. */
  serial: string;
  /** The product name of this device. Example: `"P1 Meter"` */
  product_name: string;
  /** The product type, see Supported devices. Make sure your application can handle other values for future products. Example: `"HWE-P1"` */
  product_type: SupportedDevices;
}

/**
 * The product type that is used in the certificate of the device, by `product_type`.
 *
 * The device does not have a domain name, the certificate is issued to `appliance/<certificate product type>/<serial>`.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#https
 */
export const CertificateProductTypes: Partial<Record<SupportedDevices, string>> = {
  'HWE-P1': 'p1dongle',
  'HWE-SKT': 'energysocket',
  'HWE-WTR': 'watermeter',
  'HWE-DSP': 'display',
  'HWE-KWH1': 'energymeter',
  'HWE-KWH3': 'energymeter',
  'SDM230-wifi': 'energymeter',
  'SDM630-wifi': 'energymeter',
  'HWE-BAT': 'battery',
  // TODO: 'HWE-TMP', not known yet. Use the `id` txt record of the mDNS discovery response for this device.
};

/**
 * Returns the identifier a device uses in its certificate: `appliance/<certificate product type>/<serial>`.
 *
 * This is the same value as the `id` txt record of the mDNS discovery response.
 * Returns `undefined` when the product type is unknown.
 */
export function getCertificateIdentifier(productType: string, serial: string): string | undefined {
  const certificateProductType = CertificateProductTypes[productType as SupportedDevices];

  if (!certificateProductType) return undefined;

  return `appliance/${certificateProductType}/${serial}`;
}

/**
 * Local users are prefixed with `local/`, users created by the HomeWizard cloud are prefixed with `cloud/`.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization
 */
export const LOCAL_USER_PREFIX = 'local/';

/**
 * Response of `POST /api/user`. The token must be stored, it can not be requested again.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#create-a-user-and-get-token
 */
export interface UserResponse {
  /** The token to use in the `Authorization: Bearer <token>` header. 32 uppercase hexadecimal characters. */
  token: string;
  /** The name of the user, including the `local/` prefix. */
  name: string;
}

/**
 * An entry of the response of `GET /api/user`.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#list-users
 */
export interface UserListItem {
  /** The name of the user, including the `local/` or `cloud/` prefix. */
  name: string;
  /** Only present (and `true`) on the user that did the request. */
  current?: boolean;
}

export type UserListResponse = UserListItem[];

/**
 * In API v2 errors are returned as `{"error": "<scope>:<error>"}`.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/error-handling
 */
export interface ErrorV2Response {
  error: ErrorCodesV2 | string;
}

/**
 * The error codes of the API v2. This list might be extended in the future, make sure your application can handle other values.
 *
 * `json:parameter-invalid-type:<parameter>` and `json:parameter-missing:<parameter>` are followed by the name of the parameter.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/error-handling
 */
export enum ErrorCodesV2 {
  REQUEST_INVALID_JSON = 'request:invalid-json',
  REQUEST_API_VERSION_NOT_SUPPORTED = 'request:api-version-not-supported',
  REQUEST_INTERNAL_SERVER_ERROR = 'request:internal-server-error',
  REQUEST_TOO_LARGE = 'request:too-large',
  REQUEST_UNKNOWN_SUBSCRIPTION = 'request:unknown-subscription',
  REQUEST_UNKNOWN_TYPE = 'request:unknown-type',
  JSON_NO_PARAMETERS_RECOGNIZED = 'json:no-parameters-recognized',
  JSON_PARAMETER_INVALID_TYPE = 'json:parameter-invalid-type',
  JSON_PARAMETER_MISSING = 'json:parameter-missing',
  JSON_PARAMETER_NOT_EXCLUSIVE = 'json:parameter-not-exclusive',
  TELEGRAM_NO_TELEGRAM_RECEIVED = 'telegram:no-telegram-received',
  /** The button on the device is not pressed (yet), keep trying. */
  USER_CREATION_NOT_ENABLED = 'user:creation-not-enabled',
  USER_INVALID_PREFIX = 'user:invalid-prefix',
  USER_NAME_EMPTY = 'user:name-empty',
  USER_NAME_INVALID = 'user:name-invalid',
  USER_NAME_TOO_LONG = 'user:name-too-long',
  USER_NO_STORAGE = 'user:no-storage',
  USER_NOT_FOUND = 'user:not-found',
  USER_UNAUTHORIZED = 'user:unauthorized',
}

/**
 * An externally connected utility meter (gas, water, heat...) of the smart meter.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement
 */
export interface ExternalMeasurement {
  /** The unique identifier of the external device. */
  unique_id: string;
  /** The type of the device. Make sure your application can handle other values. */
  type:
    | 'gas_meter'
    | 'heat_meter'
    | 'warm_water_meter'
    | 'water_meter'
    | 'inlet_heat_meter'
    | (string & NonNullable<unknown>);
  /** The timestamp of the last measurement of the external device, formatted as `YYYY-MM-DDTHH:mm:ss`. */
  timestamp: string;
  /** The raw value. */
  value: number;
  /** The unit of the value, for example: `"m3"` or `"GJ"` */
  unit: string;
}

/**
 * The /api/measurement endpoint allows you to get the most recent measurement from the device.
 *
 * All datapoints are "optional"; The API does not send datapoints that are null. Make sure your application can handle this.
 *
 * Timestamps are formatted as `YYYY-MM-DDTHH:mm:ss` (ISO 8601, without timezone).
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement
 */
export interface BaseMeasurementResponse {
  /** The unique identifier from the smart meter. Available for: `HWE-P1` */
  unique_id?: string;
  /** The DSMR version of the smart meter. Available for: `HWE-P1` */
  protocol_version?: number;
  /** The brand indification the smart meter. Available for: `HWE-P1` */
  meter_model?: string;
  /** The timestamp the smart meter sent the measurement. Available for: `HWE-P1` */
  timestamp?: string;
  /** The active tariff, matches one of the totals. Available for: `HWE-P1` */
  tariff?: number;
  /** The energy usage meter reading for all tariffs in kWh. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `HWE-BAT` */
  energy_import_kwh?: number;
  /** The energy usage meter reading for tariff 1 in kWh. Available for: `HWE-P1` */
  energy_import_t1_kwh?: number;
  /** The energy usage meter reading for tariff 2 in kWh. Available for: `HWE-P1` */
  energy_import_t2_kwh?: number;
  /** The energy usage meter reading for tariff 3 in kWh. Available for: `HWE-P1` */
  energy_import_t3_kwh?: number;
  /** The energy usage meter reading for tariff 4 in kWh. Available for: `HWE-P1` */
  energy_import_t4_kwh?: number;
  /** The energy feed-in meter reading for all tariffs in kWh. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `HWE-BAT` */
  energy_export_kwh?: number;
  /** The energy feed-in meter reading for tariff 1 in kWh. Available for: `HWE-P1` */
  energy_export_t1_kwh?: number;
  /** The energy feed-in meter reading for tariff 2 in kWh. Available for: `HWE-P1` */
  energy_export_t2_kwh?: number;
  /** The energy feed-in meter reading for tariff 3 in kWh. Available for: `HWE-P1` */
  energy_export_t3_kwh?: number;
  /** The energy feed-in meter reading for tariff 4 in kWh. Available for: `HWE-P1` */
  energy_export_t4_kwh?: number;
  /** The total active usage in watt, negative when exporting. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `HWE-BAT` */
  power_w?: number;
  /** The active usage for phase 1 in watt. Available for: `HWE-P1`, `HWE-KWH3` */
  power_l1_w?: number;
  /** The active usage for phase 2 in watt. Available for: `HWE-P1`, `HWE-KWH3` */
  power_l2_w?: number;
  /** The active usage for phase 3 in watt. Available for: `HWE-P1`, `HWE-KWH3` */
  power_l3_w?: number;
  /** The active voltage in volt. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-BAT` */
  voltage_v?: number;
  /** The active voltage for phase 1 in volt. Available for: `HWE-P1`, `HWE-KWH3` */
  voltage_l1_v?: number;
  /** The active voltage for phase 2 in volt. Available for: `HWE-P1`, `HWE-KWH3` */
  voltage_l2_v?: number;
  /** The active voltage for phase 3 in volt. Available for: `HWE-P1`, `HWE-KWH3` */
  voltage_l3_v?: number;
  /** The active current in ampere (sum of the absolute phase currents on multi phase). Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `HWE-BAT` */
  current_a?: number;
  /** The active current for phase 1 in ampere. Available for: `HWE-P1`, `HWE-KWH3` */
  current_l1_a?: number;
  /** The active current for phase 2 in ampere. Available for: `HWE-P1`, `HWE-KWH3` */
  current_l2_a?: number;
  /** The active current for phase 3 in ampere. Available for: `HWE-P1`, `HWE-KWH3` */
  current_l3_a?: number;
  /** The apparent current in ampere. Available for: `HWE-KWH1`, `HWE-KWH3` */
  apparent_current_a?: number;
  /** The apparent current for phase 1 in ampere. Available for: `HWE-KWH3` */
  apparent_current_l1_a?: number;
  /** The apparent current for phase 2 in ampere. Available for: `HWE-KWH3` */
  apparent_current_l2_a?: number;
  /** The apparent current for phase 3 in ampere. Available for: `HWE-KWH3` */
  apparent_current_l3_a?: number;
  /** The reactive current in ampere. Available for: `HWE-KWH1`, `HWE-KWH3` */
  reactive_current_a?: number;
  /** The reactive current for phase 1 in ampere. Available for: `HWE-KWH3` */
  reactive_current_l1_a?: number;
  /** The reactive current for phase 2 in ampere. Available for: `HWE-KWH3` */
  reactive_current_l2_a?: number;
  /** The reactive current for phase 3 in ampere. Available for: `HWE-KWH3` */
  reactive_current_l3_a?: number;
  /** The apparent power in volt-ampere. Available for: `HWE-KWH1`, `HWE-KWH3` */
  apparent_power_va?: number;
  /** The apparent power for phase 1 in volt-ampere. Available for: `HWE-KWH3` */
  apparent_power_l1_va?: number;
  /** The apparent power for phase 2 in volt-ampere. Available for: `HWE-KWH3` */
  apparent_power_l2_va?: number;
  /** The apparent power for phase 3 in volt-ampere. Available for: `HWE-KWH3` */
  apparent_power_l3_va?: number;
  /** The reactive power in volt-ampere reactive. Available for: `HWE-KWH1`, `HWE-KWH3` */
  reactive_power_var?: number;
  /** The reactive power for phase 1 in volt-ampere reactive. Available for: `HWE-KWH3` */
  reactive_power_l1_var?: number;
  /** The reactive power for phase 2 in volt-ampere reactive. Available for: `HWE-KWH3` */
  reactive_power_l2_var?: number;
  /** The reactive power for phase 3 in volt-ampere reactive. Available for: `HWE-KWH3` */
  reactive_power_l3_var?: number;
  /** The power factor. Available for: `HWE-KWH1` */
  power_factor?: number;
  /** The power factor for phase 1. Available for: `HWE-KWH3` */
  power_factor_l1?: number;
  /** The power factor for phase 2. Available for: `HWE-KWH3` */
  power_factor_l2?: number;
  /** The power factor for phase 3. Available for: `HWE-KWH3` */
  power_factor_l3?: number;
  /** Line frequency in hertz. Available for: `HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `HWE-BAT` */
  frequency_hz?: number;
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
  /** Number of 'long' power failures detected by meter. Available for: `HWE-P1` */
  long_power_fail_count?: number;
  /** The active average demand of the last 15 minutes in watt (capacity rate meters only). Available for: `HWE-P1` */
  average_power_15m_w?: number;
  /** The peak average demand of this month in watt (capacity rate meters only). Available for: `HWE-P1` */
  monthly_power_peak_w?: number;
  /** Timestamp when the peak demand was registered (capacity rate meters only). Available for: `HWE-P1` */
  monthly_power_peak_timestamp?: string;
  /** A list of externally connected utility meters. Available for: `HWE-P1` */
  external?: ExternalMeasurement[];
  /** The current state of charge in percent. Available for: `HWE-BAT` */
  state_of_charge_pct?: number;
  /** The number of battery cycles. Available for: `HWE-BAT` */
  cycles?: number;
}

/**
 * API /api/measurement response for `HWE-P1`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#p1-meter-hwe-p1
 */
export type P1MeterMeasurementResponse = Pick<
  BaseMeasurementResponse,
  | 'unique_id'
  | 'protocol_version'
  | 'meter_model'
  | 'timestamp'
  | 'tariff'
  | 'energy_import_kwh'
  | 'energy_import_t1_kwh'
  | 'energy_import_t2_kwh'
  | 'energy_import_t3_kwh'
  | 'energy_import_t4_kwh'
  | 'energy_export_kwh'
  | 'energy_export_t1_kwh'
  | 'energy_export_t2_kwh'
  | 'energy_export_t3_kwh'
  | 'energy_export_t4_kwh'
  | 'power_w'
  | 'power_l1_w'
  | 'power_l2_w'
  | 'power_l3_w'
  | 'voltage_v'
  | 'voltage_l1_v'
  | 'voltage_l2_v'
  | 'voltage_l3_v'
  | 'current_a'
  | 'current_l1_a'
  | 'current_l2_a'
  | 'current_l3_a'
  | 'frequency_hz'
  | 'voltage_sag_l1_count'
  | 'voltage_sag_l2_count'
  | 'voltage_sag_l3_count'
  | 'voltage_swell_l1_count'
  | 'voltage_swell_l2_count'
  | 'voltage_swell_l3_count'
  | 'any_power_fail_count'
  | 'long_power_fail_count'
  | 'average_power_15m_w'
  | 'monthly_power_peak_w'
  | 'monthly_power_peak_timestamp'
  | 'external'
>;

/**
 * API /api/measurement response for `HWE-KWH1` and `SDM230-wifi`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#kwh-meter-1-phase-hwe-kwh1-and-sdm230-wifi
 */
export type KwhMeter1PhaseMeasurementResponse = Pick<
  BaseMeasurementResponse,
  | 'energy_import_kwh'
  | 'energy_export_kwh'
  | 'power_w'
  | 'voltage_v'
  | 'current_a'
  | 'apparent_current_a'
  | 'reactive_current_a'
  | 'apparent_power_va'
  | 'reactive_power_var'
  | 'power_factor'
  | 'frequency_hz'
>;

/**
 * API /api/measurement response for `HWE-KWH3` and `SDM630-wifi`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#kwh-meter-3-phase-hwe-kwh3-and-sdm630-wifi
 */
export type KwhMeter3PhaseMeasurementResponse = Pick<
  BaseMeasurementResponse,
  | 'energy_import_kwh'
  | 'energy_export_kwh'
  | 'power_w'
  | 'power_l1_w'
  | 'power_l2_w'
  | 'power_l3_w'
  | 'voltage_l1_v'
  | 'voltage_l2_v'
  | 'voltage_l3_v'
  | 'current_a'
  | 'current_l1_a'
  | 'current_l2_a'
  | 'current_l3_a'
  | 'apparent_current_a'
  | 'apparent_current_l1_a'
  | 'apparent_current_l2_a'
  | 'apparent_current_l3_a'
  | 'reactive_current_a'
  | 'reactive_current_l1_a'
  | 'reactive_current_l2_a'
  | 'reactive_current_l3_a'
  | 'apparent_power_va'
  | 'apparent_power_l1_va'
  | 'apparent_power_l2_va'
  | 'apparent_power_l3_va'
  | 'reactive_power_var'
  | 'reactive_power_l1_var'
  | 'reactive_power_l2_var'
  | 'reactive_power_l3_var'
  | 'power_factor_l1'
  | 'power_factor_l2'
  | 'power_factor_l3'
  | 'frequency_hz'
>;

/**
 * API /api/measurement response for `HWE-BAT`
 *
 * @link https://api-documentation.homewizard.com/docs/v2/measurement#plug-in-battery-hwe-bat
 */
export type PlugInBatteryMeasurementResponse = Pick<
  BaseMeasurementResponse,
  | 'energy_import_kwh'
  | 'energy_export_kwh'
  | 'power_w'
  | 'voltage_v'
  | 'current_a'
  | 'frequency_hz'
  | 'state_of_charge_pct'
  | 'cycles'
>;

/**
 * The /api/system endpoint can be used to get and configure system settings.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/system
 */
export interface SystemV2Response {
  /** The Wi-Fi network that the device is connected to. */
  wifi_ssid?: string;
  /** The strength of the Wi-Fi signal in dB. */
  wifi_rssi_db?: number;
  /** The uptime of the device in seconds. */
  uptime_s?: number;
  /** If the device communicates with the HomeWizard cloud. Always `true` and read-only on the `HWE-BAT`. */
  cloud_enabled?: boolean;
  /** The brightness of the status LED in percent, from `0` to `100`. */
  status_led_brightness_pct?: number;
  /** If the API v1 is enabled. Not available on the `HWE-BAT`. Will be removed when the API v1 is removed. */
  api_v1_enabled?: boolean;
}

export type SystemV2PutParams = Partial<
  Pick<SystemV2Response, 'cloud_enabled' | 'status_led_brightness_pct' | 'api_v1_enabled'>
>;

/**
 * - `zero`: keeps the net power of the home around zero by charging and discharging.
 * - `to_full`: (legacy, use `charge_to_full`) charges all batteries to 100%, then goes back to `zero`.
 * - `standby`: (legacy, same as `zero` without permissions) batteries do not charge or discharge.
 * - `predictive`: charge and discharge permissions are set by the HomeWizard cloud. Available since API 2.3.0.
 */
export type BatteriesMode = 'zero' | 'to_full' | 'standby' | 'predictive';

export type BatteriesPermission = 'charge_allowed' | 'discharge_allowed';

/**
 * The /api/batteries endpoint can be used to get and control the Plug-In Batteries that are connected to a P1 Meter or kWh Meter.
 *
 * This endpoint is exposed by the `HWE-P1` and the kWh meters, not by the `HWE-BAT` itself.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/batteries
 */
export interface BatteriesResponse {
  /** The control mode of the batteries. Available since API 2.1.0 */
  mode: BatteriesMode;
  /** The permissions of the batteries, an empty list when nothing is allowed. Read-only in the `to_full` mode. Available since API 2.2.0 */
  permissions?: BatteriesPermission[];
  /** If the batteries are charging to 100%. Goes back to `false` when all batteries are charged. Available since API 2.3.0 */
  charge_to_full?: boolean;
  /** The number of connected Plug-In Batteries. Available since API 2.2.0 */
  battery_count?: number;
  /** The current combined power of all batteries in watt. Negative when discharging. */
  power_w: number;
  /** The target power of all batteries in watt. */
  target_power_w: number;
  /** The maximum allowed consumption in watt. */
  max_consumption_w: number;
  /** The maximum allowed production in watt. */
  max_production_w: number;
}

/**
 * `mode: 'to_full'` and `permissions` can not be combined in the same request.
 */
export type BatteriesPutParams = Partial<
  Pick<BatteriesResponse, 'mode' | 'permissions' | 'charge_to_full'>
>;
