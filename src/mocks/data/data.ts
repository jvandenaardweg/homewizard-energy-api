import { EnergySocketDataResponse, P1MeterDataResponse } from '../../types';

export const mockEnergySocketDataResponse: EnergySocketDataResponse = {
  wifi_ssid: 'SOME_WIFI_SSID',
  wifi_strength: 44,
  total_power_import_t1_kwh: 309.697,
  total_power_export_t1_kwh: 0,
  active_power_w: 1858.022,
  active_power_l1_w: 1858.022,
};

export const mockP1MeterDataResponse: P1MeterDataResponse = {
  smr_version: 50,
  meter_model: 'ISKRA 2M550T-1012',
  wifi_ssid: 'SOME_WIFI_SSID',
  wifi_strength: 100,
  total_power_import_t1_kwh: 19028.484,
  total_power_import_t2_kwh: 19471.383,
  total_power_export_t1_kwh: 0.002,
  total_power_export_t2_kwh: 0.007,
  active_power_w: 407,
  active_power_l1_w: 73,
  active_power_l2_w: 73,
  active_power_l3_w: 263,
  total_gas_m3: 6741.77,
  gas_timestamp: 221212222010,
};
