import {
  Batteries,
  DeviceInformation,
  KwhMeter1PhaseMeasurement,
  KwhMeter3PhaseMeasurement,
  KwhMeterSystem,
  P1MeterMeasurement,
  P1MeterSystem,
  PlugInBatteryMeasurement,
  PlugInBatterySystem,
  User,
  UserCreated,
} from '@/types';

/*
 * Fixtures from HomeWizard's own Python library, homewizard/python-homewizard-energy (Apache-2.0), at commit
 * 60be21a: https://github.com/homewizard/python-homewizard-energy/tree/60be21a/tests/v2/fixtures
 *
 * They follow the examples in the API v2 docs, https://api-documentation.homewizard.com/docs/category/api-v2.
 * Where they differ from the docs, the docs win, because the types follow the docs: see `mockV2KwhMeterSystem`.
 */

export const mockV2Identifier = 'appliance/p1dongle/5c2fafaabbcc';
export const mockV2Token = '0123456789ABCDEF0123456789ABCDEF';

export const mockV2DeviceInformation: Record<
  'HWE-P1' | 'HWE-KWH1' | 'HWE-KWH3' | 'HWE-BAT',
  DeviceInformation
> = {
  'HWE-P1': {
    product_name: 'P1 Meter',
    product_type: 'HWE-P1',
    serial: '5c2fafaabbcc',
    firmware_version: '6.00',
    api_version: '2.0.0',
  },
  'HWE-KWH1': {
    product_name: 'kWh Meter 1-Phase',
    product_type: 'HWE-KWH1',
    serial: '5c2fafaabbcc',
    firmware_version: '6.00',
    api_version: '2.1.0',
  },
  'HWE-KWH3': {
    product_name: 'kWh Meter 3-Phase',
    product_type: 'HWE-KWH3',
    serial: '5c2fafaabbcc',
    firmware_version: '6.00',
    api_version: '2.1.0',
  },
  'HWE-BAT': {
    product_name: 'Plug-in Battery',
    product_type: 'HWE-BAT',
    serial: '5c2fafaabbcc',
    firmware_version: '6.00',
    api_version: '2.0.0',
  },
};

export const mockV2UserCreated: UserCreated = {
  name: 'local/new_user',
  token: mockV2Token,
};

export const mockV2Users: User[] = [
  { name: 'local/new_user', current: true },
  { name: 'cloud/cloud_user' },
];

/** `HWE-P1` (3-phase, with gas and water meter) */
export const mockV2P1MeterMeasurement: P1MeterMeasurement = {
  protocol_version: 50,
  meter_model: 'ISKRA  2M550T-101',
  unique_id: '4E6576657220476F6E6E61204C657420596F7520446F776E',
  timestamp: '2024-06-28T14:12:34',
  tariff: 2,
  energy_import_kwh: 13779.338,
  energy_import_t1_kwh: 10830.511,
  energy_import_t2_kwh: 2948.827,
  energy_export_kwh: 0,
  energy_export_t1_kwh: 0,
  energy_export_t2_kwh: 0,
  power_w: -543,
  power_l1_w: -676,
  power_l2_w: 133,
  power_l3_w: 0,
  current_a: 6,
  current_l1_a: -4,
  current_l2_a: 2,
  current_l3_a: 0,
  voltage_sag_l1_count: 1,
  voltage_sag_l2_count: 1,
  voltage_sag_l3_count: 0,
  voltage_swell_l1_count: 0,
  voltage_swell_l2_count: 0,
  voltage_swell_l3_count: 0,
  any_power_fail_count: 4,
  long_power_fail_count: 5,
  average_power_15m_w: 123.0,
  monthly_power_peak_w: 1111.0,
  monthly_power_peak_timestamp: '2024-06-04T10:11:22',
  external: [
    {
      unique_id: '4E6576657220676F6E6E612072756E2061726F756E64',
      type: 'gas_meter',
      timestamp: '2024-06-28T14:00:00',
      value: 2569.646,
      unit: 'm3',
    },
    {
      unique_id: '616E642064657365727420796F75',
      type: 'water_meter',
      timestamp: '2024-06-28T14:05:00',
      value: 123.456,
      unit: 'm3',
    },
  ],
};

/** `HWE-P1` (1-phase, no gas): the data points a meter can leave out are missing. */
export const mockV2P1MeterMeasurement1PhaseNoGas: P1MeterMeasurement = {
  protocol_version: 50,
  meter_model: 'ISKRA  2M550T-101',
  unique_id: '4E6576657220476F6E6E61204769766520596F75205570',
  timestamp: '2024-06-28T14:12:34',
  energy_import_t1_kwh: 10830.511,
  energy_import_t2_kwh: 2948.827,
  energy_export_t1_kwh: 1285.951,
  energy_export_t2_kwh: 2876.51,
  power_w: -678,
  power_l1_w: -676,
};

export const mockV2KwhMeter1PhaseMeasurement: KwhMeter1PhaseMeasurement = {
  energy_import_kwh: 123.456,
  energy_export_kwh: 78.91,
  power_w: 123,
  voltage_v: 230,
  current_a: 1.5,
  apparent_current_a: 1.6,
  reactive_current_a: 0.5,
  apparent_power_va: 345,
  reactive_power_var: 67,
  power_factor: 0.95,
  frequency_hz: 50,
};

export const mockV2KwhMeter3PhaseMeasurement: KwhMeter3PhaseMeasurement = {
  energy_import_kwh: 123.456,
  energy_export_kwh: 78.91,
  power_w: 123,
  power_l1_w: 50,
  power_l2_w: 40,
  power_l3_w: -30,
  voltage_l1_v: 230,
  voltage_l2_v: 230,
  voltage_l3_v: 230,
  current_a: 1.5,
  current_l1_a: -0.5,
  current_l2_a: 0.8,
  current_l3_a: 1.2,
  apparent_current_a: 1.6,
  apparent_current_l1_a: 0.6,
  apparent_current_l2_a: 0.9,
  apparent_current_l3_a: 1.3,
  reactive_current_a: 0.5,
  reactive_current_l1_a: -0.2,
  reactive_current_l2_a: 0.3,
  reactive_current_l3_a: 0.4,
  apparent_power_va: 345,
  apparent_power_l1_va: 115,
  apparent_power_l2_va: 120,
  apparent_power_l3_va: 110,
  reactive_power_var: 67,
  reactive_power_l1_var: -20,
  reactive_power_l2_var: 30,
  reactive_power_l3_var: 57,
  power_factor_l1: 0.95,
  power_factor_l2: 0.9,
  power_factor_l3: 0.85,
  frequency_hz: 50,
};

export const mockV2PlugInBatteryMeasurement: PlugInBatteryMeasurement = {
  energy_import_kwh: 123.456,
  energy_export_kwh: 321.654,
  power_w: 1234,
  voltage_v: 230.123,
  current_a: 5.678,
  frequency_hz: 50.123,
  cycles: 123,
  state_of_charge_pct: 50.123,
};

export const mockV2P1MeterSystem: P1MeterSystem = {
  wifi_ssid: 'My Wi-Fi',
  wifi_rssi_db: -77,
  cloud_enabled: false,
  uptime_s: 356,
  status_led_brightness_pct: 100,
  api_v1_enabled: true,
};

/**
 * The Python library's kWh meter fixture has `status_led_brightness_pct` and no `api_v1_enabled`, the same as its
 * Plug-In Battery fixture. The docs say the kWh meters have `api_v1_enabled` and no status LED setting, so this
 * follows the docs.
 */
export const mockV2KwhMeterSystem: KwhMeterSystem = {
  wifi_ssid: 'My Wi-Fi',
  wifi_rssi_db: -77,
  cloud_enabled: false,
  uptime_s: 356,
  api_v1_enabled: true,
};

export const mockV2PlugInBatterySystem: PlugInBatterySystem = {
  wifi_ssid: 'My Wi-Fi',
  wifi_rssi_db: -77,
  cloud_enabled: false,
  uptime_s: 356,
  status_led_brightness_pct: 100,
};

/** The batteries response per API version: `permissions` and `battery_count` from 2.2.0, `charge_to_full` from 2.3.0. */
export const mockV2BatteriesByApiVersion: Record<'2.1.0' | '2.2.0' | '2.3.0', Batteries> = {
  '2.1.0': {
    mode: 'zero',
    power_w: -404,
    target_power_w: -400,
    max_consumption_w: 1600,
    max_production_w: 800,
  },
  '2.2.0': {
    mode: 'zero',
    permissions: ['charge_allowed', 'discharge_allowed'],
    battery_count: 2,
    power_w: -404,
    target_power_w: -400,
    max_consumption_w: 1600,
    max_production_w: 800,
  },
  '2.3.0': {
    mode: 'predictive',
    permissions: ['charge_allowed', 'discharge_allowed'],
    charge_to_full: false,
    battery_count: 2,
    power_w: -404,
    target_power_w: -400,
    max_consumption_w: 1600,
    max_production_w: 800,
  },
};

export const mockV2Batteries: Batteries = mockV2BatteriesByApiVersion['2.2.0'];

/** A full `HWE-P1` telegram (DSMR 5.0, with a gas meter). The fixture escapes the backslash in the header; a real telegram has one. */
export const mockV2Telegram = `/ISK5\\2M550T-10111-

3:0.2.8(50)
0-0:1.0.0(181106140429W)
0-0:96.1.1(31333631353032362020202020202020)
1-0:1.8.1(10830.511*kWh)
1-0:1.8.2(002948.827*kWh)
1-0:2.8.1(001285.951*kWh)
1-0:2.8.2(002876.514*kWh)
0-0:96.14.0(0002)
1-0:1.7.0(21.100*kW)
1-0:2.7.0(00.000*kW)
0-0:96.7.21(00006)
0-0:96.7.9(00003)
1-0:99.97.0(1)(0-0:96.7.19)(180529135630S)(0000002451*s)
1-0:32.32.0(00003)
1-0:52.32.0(00002)
1-0:72.32.0(00002)
1-0:32.36.0(00001)
1-0:52.36.0(00001)
1-0:72.36.0(00001)
0-0:96.13.0()
1-0:32.7.0(236.0*V)
1-0:52.7.0(232.6*V)
1-0:72.7.0(235.1*V)
1-0:31.7.0(002*A)
1-0:51.7.0(000*A)
1-0:71.7.0(000*A)
1-0:21.7.0(00.000*kW)
1-0:41.7.0(00.033*kW)
1-0:61.7.0(00.132*kW)
1-0:22.7.0(00.676*kW)
1-0:42.7.0(00.000*kW)
1-0:62.7.0(00.000*kW)
0-1:24.1.0(003)
0-1:96.1.0(4730303339303031373030343630313137)
0-1:24.2.1(210606140010W)(02569.646*m3)
!1F28`;
