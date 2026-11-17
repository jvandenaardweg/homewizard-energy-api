import { BasicInformationResponse, SupportedDevices } from '../../v1/types';

// The entries with a source comment come from home-assistant/core (Apache-2.0) at commit 0dd1492, tests/components/homewizard/fixtures
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
  // From HWE-WTR/device.json in Home Assistant's fixtures
  'HWE-WTR': {
    product_type: 'HWE-WTR',
    product_name: 'Watermeter',
    serial: '5c2fafabcdef',
    firmware_version: '2.03',
    api_version: 'v1',
  },
  // From HWE-KWH1/device.json in Home Assistant's fixtures
  'HWE-KWH1': {
    product_type: 'HWE-KWH1',
    product_name: 'kWh meter',
    serial: '5c2fafabcdef',
    firmware_version: '3.06',
    api_version: 'v1',
  },
  // From HWE-KWH3/device.json in Home Assistant's fixtures
  'HWE-KWH3': {
    product_type: 'HWE-KWH3',
    product_name: 'KWh meter 3-phase',
    serial: '5c2fafabcdef',
    firmware_version: '3.06',
    api_version: 'v1',
  },
  // From SDM230/device.json in Home Assistant's fixtures
  'SDM230-wifi': {
    product_type: 'SDM230-wifi',
    product_name: 'kWh meter',
    serial: '5c2fafabcdef',
    firmware_version: '3.06',
    api_version: 'v1',
  },
  // From SDM630/device.json in Home Assistant's fixtures
  'SDM630-wifi': {
    product_type: 'SDM630-wifi',
    product_name: 'KWh meter 3-phase',
    serial: '5c2fafabcdef',
    firmware_version: '3.06',
    api_version: 'v1',
  },
};
