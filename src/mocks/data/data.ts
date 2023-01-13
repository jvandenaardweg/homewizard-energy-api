import {
  EnergySocketDataResponse,
  KwhMeter1PhaseDataResponse,
  KwhMeter3PhaseDataResponse,
  P1MeterDataResponse,
  WaterMeterDataResponse,
} from '../../types';

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

export const mockWaterMeterDataResponse: WaterMeterDataResponse = {
  wifi_ssid: 'My Wi-Fi',
  wifi_strength: 100,
  total_liter_m3: 123.456,
  active_liter_lpm: 7.2,
};

export const mockKwhMeter1PhaseResponse: KwhMeter1PhaseDataResponse = {
  // smr_version: 50, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  // meter_model: 'ISKRA  2M550T-101', // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  wifi_ssid: 'My Wi-Fi',
  wifi_strength: 100,
  total_power_import_t1_kwh: 10830.511,
  // total_power_import_t2_kwh: 2948.827, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  total_power_export_t1_kwh: 1285.951,
  // total_power_export_t2_kwh: 2876.51, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  active_power_w: -678,
  active_power_l1_w: -676,
};

export const mockKwhMeter3PhaseResponse: KwhMeter3PhaseDataResponse = {
  // smr_version: 50, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  // meter_model: 'ISKRA  2M550T-101', // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  wifi_ssid: 'My Wi-Fi',
  wifi_strength: 100,
  total_power_import_t1_kwh: 10830.511,
  // total_power_import_t2_kwh: 2948.827, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  total_power_export_t1_kwh: 1285.951,
  // total_power_export_t2_kwh: 2876.51, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  active_power_w: -543,
  active_power_l1_w: -676,
  // active_power_l2_w: 133, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  // active_power_l3_w: 0, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  // total_gas_m3: 2569.646, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
  // gas_timestamp: 210606140010, // example says available, but not in types? https://homewizard-energy-api.readthedocs.io/endpoints.html#examples
};

export const mockP1MeterDataResponseWithExternalPower: P1MeterDataResponse = {
  wifi_ssid: 'My Wi-Fi',
  wifi_strength: 100,
  smr_version: 50,
  meter_model: 'ISKRA  2M550T-101',
  unique_id: '00112233445566778899AABBCCDDEEFF',
  active_tariff: 2,
  total_power_import_kwh: 13779.338,
  total_power_import_t1_kwh: 10830.511,
  total_power_import_t2_kwh: 2948.827,
  total_power_export_kwh: 0,
  total_power_export_t1_kwh: 0,
  total_power_export_t2_kwh: 0,
  active_power_w: -543,
  active_power_l1_w: -676,
  active_power_l2_w: 133,
  active_power_l3_w: 0,
  active_current_l1_a: -4,
  active_current_l2_a: 2,
  active_current_l3_a: 0,
  voltage_sag_l1_count: 1,
  voltage_sag_l2_count: 1,
  voltage_sag_l3_count: 0,
  voltage_swell_l1_count: 0,
  voltage_swell_l2_count: 0,
  voltage_swell_l3_count: 0,
  any_power_fail_count: 4,
  long_power_fail_count: 5,
  total_gas_m3: 2569.646,
  gas_timestamp: 210606140010,
  gas_unique_id: 'FFEEDDCCBBAA99887766554433221100',
  active_power_average_w: 123.0,
  montly_power_peak_w: 1111.0,
  montly_power_peak_timestamp: 230101080010,
  external: [
    {
      unique_id: 'FFEEDDCCBBAA99887766554433221100',
      type: 'gas_meter',
      timestamp: 210606140010,
      value: 2569.646,
      unit: 'm3',
    },
  ],
};
