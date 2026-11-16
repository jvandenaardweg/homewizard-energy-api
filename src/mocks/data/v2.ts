import { BasicInformationResponse } from '../../types';
import {
  BatteriesResponse,
  KwhMeter1PhaseMeasurementResponse,
  KwhMeter3PhaseMeasurementResponse,
  P1MeterMeasurementResponse,
  PlugInBatteryMeasurementResponse,
  SystemV2Response,
  UserListResponse,
} from '../../types-v2';

export const mockBasicInformationV2Response: BasicInformationResponse = {
  product_name: 'P1 Meter',
  product_type: 'HWE-P1',
  serial: '5c2fafaabbcc',
  firmware_version: '6.00',
  api_version: '2.0.0',
};

export const mockP1MeterMeasurementResponse: P1MeterMeasurementResponse = {
  protocol_version: 50,
  meter_model: 'ISKRA  2M550T-101',
  unique_id: '4E6576657220476F6E6E61204C657420596F7520446F776E',
  timestamp: '2024-06-28T14:12:34',
  tariff: 2,
  energy_import_kwh: 13779.338,
  energy_import_t1_kwh: 10830.511,
  energy_import_t2_kwh: 2948.827,
  power_w: -543,
  power_l1_w: -676,
  power_l2_w: 133,
  power_l3_w: 0,
  current_a: 6,
  current_l1_a: -4,
  current_l2_a: 2,
  current_l3_a: 0,
  any_power_fail_count: 4,
  long_power_fail_count: 5,
  average_power_15m_w: 123,
  monthly_power_peak_w: 1111,
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

export const mockKwhMeter1PhaseMeasurementResponse: KwhMeter1PhaseMeasurementResponse = {
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

export const mockKwhMeter3PhaseMeasurementResponse: KwhMeter3PhaseMeasurementResponse = {
  energy_import_kwh: 123.456,
  energy_export_kwh: 78.91,
  power_w: 900,
  power_l1_w: 200,
  power_l2_w: 300,
  power_l3_w: 400,
  voltage_l1_v: 230,
  voltage_l2_v: 231,
  voltage_l3_v: 229,
  current_a: 4,
  current_l1_a: 1,
  current_l2_a: 1.3,
  current_l3_a: 1.7,
  power_factor_l1: 0.95,
  power_factor_l2: 0.96,
  power_factor_l3: 0.97,
  frequency_hz: 50,
};

export const mockPlugInBatteryMeasurementResponse: PlugInBatteryMeasurementResponse = {
  energy_import_kwh: 123.456,
  energy_export_kwh: 123.456,
  power_w: 123,
  voltage_v: 230,
  current_a: 1.5,
  frequency_hz: 50,
  state_of_charge_pct: 50,
  cycles: 123,
};

export const mockSystemV2Response: SystemV2Response = {
  wifi_ssid: 'My Wi-Fi',
  wifi_rssi_db: -77,
  cloud_enabled: true,
  uptime_s: 356,
  status_led_brightness_pct: 100,
  api_v1_enabled: true,
};

export const mockBatteriesResponse: BatteriesResponse = {
  mode: 'zero',
  permissions: ['charge_allowed', 'discharge_allowed'],
  charge_to_full: false,
  battery_count: 2,
  power_w: -404,
  target_power_w: -400,
  max_consumption_w: 1600,
  max_production_w: 800,
};

export const mockUserListResponse: UserListResponse = [
  { name: 'local/my-app', current: true },
  { name: 'cloud/cloud_user' },
];
