import { BasicInformationResponse, SupportedDevices } from '../../types';

export const mockBasicInformationResponse: Record<SupportedDevices, BasicInformationResponse> = {
  'HWE-SKT': {
    product_type: 'HWE-SKT',
    product_name: 'Energy Socket',
    serial: '1c23e7280952',
    firmware_version: '3.02',
    api_version: 'v1',
  },
  'HWE-P1': {
    product_type: 'HWE-P1',
    product_name: 'P1 Meter',
    serial: '3c39e7aabbcc',
    firmware_version: '2.11',
    api_version: 'v1',
  },
  // TODO: mock properly
  'HWE-WTR': {
    product_type: 'HWE-WTR',
    product_name: 'Water Meter',
    serial: '1c23e7280952',
    firmware_version: '3.02',
    api_version: 'v1',
  },
  // TODO: mock properly
  'SDM230-wifi': {
    product_type: 'SDM230-wifi',
    product_name: 'kWh meter 3-phase',
    serial: '1c23e7280952',
    firmware_version: '3.02',
    api_version: 'v1',
  },
  // TODO: mock properly
  'SDM630-wifi': {
    product_type: 'SDM630-wifi',
    product_name: 'kWh meter 1-phase',
    serial: '1c23e7280952',
    firmware_version: '3.02',
    api_version: 'v1',
  },
  'HWE-KWH1': {
    product_type: 'HWE-KWH1',
    product_name: 'kWh meter 1-phase',
    serial: '1c23e7280952',
    firmware_version: '5.00',
    api_version: 'v1',
  },
  'HWE-KWH3': {
    product_type: 'HWE-KWH3',
    product_name: 'kWh meter 3-phase',
    serial: '1c23e7280952',
    firmware_version: '5.00',
    api_version: 'v1',
  },
  // Only available in the API v2
  'HWE-BAT': {
    product_type: 'HWE-BAT',
    product_name: 'Plug-In Battery',
    serial: '5c2fafaabbcc',
    firmware_version: '2.03',
    api_version: '2.0.0',
  },
  // Only available in the API v2 (in development)
  'HWE-DSP': {
    product_type: 'HWE-DSP',
    product_name: 'Energy Display',
    serial: '5c2fafaabbcc',
    firmware_version: '2.03',
    api_version: '2.0.0',
  },
};
