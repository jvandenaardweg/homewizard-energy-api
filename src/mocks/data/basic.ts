import { BasicInformationResponse, SupportedDevices } from '../../v1/types';

export const mockBasicInformationResponse: Record<SupportedDevices, BasicInformationResponse> = {
  'HWE-SKT': {
    product_type: 'HWE-SKT',
    product_name: 'Energy Socket',
    serial: '3c39e7aabb02',
    firmware_version: '4.08',
    api_version: 'v1',
  },
  'HWE-P1': {
    product_type: 'HWE-P1',
    product_name: 'P1 Meter',
    serial: '3c39e7aabbcc',
    firmware_version: '6.0305',
    api_version: 'v1',
  },
  // TODO: mock properly
  'HWE-WTR': {
    product_type: 'HWE-WTR',
    product_name: 'Water Meter',
    serial: '3c39e7aabb02',
    firmware_version: '3.02',
    api_version: 'v1',
  },
  // TODO: mock properly
  'HWE-KWH1': {
    product_type: 'HWE-KWH1',
    product_name: 'kWh meter 1-phase',
    serial: '3c39e7aabb02',
    firmware_version: '4.19',
    api_version: 'v1',
  },
  // TODO: mock properly
  'HWE-KWH3': {
    product_type: 'HWE-KWH3',
    product_name: 'kWh meter 3-phase',
    serial: '3c39e7aabb02',
    firmware_version: '4.19',
    api_version: 'v1',
  },
  // TODO: mock properly
  'SDM230-wifi': {
    product_type: 'SDM230-wifi',
    product_name: 'kWh meter 1-phase',
    serial: '3c39e7aabb02',
    firmware_version: '3.02',
    api_version: 'v1',
  },
  // TODO: mock properly
  'SDM630-wifi': {
    product_type: 'SDM630-wifi',
    product_name: 'kWh meter 3-phase',
    serial: '3c39e7aabb02',
    firmware_version: '3.02',
    api_version: 'v1',
  },
};
