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
};
