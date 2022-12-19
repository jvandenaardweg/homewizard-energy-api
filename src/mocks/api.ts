import { MockAgent } from 'undici';
import { SupportedDevices } from '../types';

export const mockHostname = 'localhost';
export const mockApiUrl = `http://${mockHostname}`;
export const mockSerialNumber = '1234567890';
export const mockFirmwareVersion = '3.1';
export const mockProductType: SupportedDevices = 'HWE-SKT';
export const mockProductName = 'Energy Socket';
export const mockApiVersion = 'v1';

export const mockApiAgent = new MockAgent({
  bodyTimeout: 10,
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10,
});

mockApiAgent.disableNetConnect();

export const mockApiPool = mockApiAgent.get(mockApiUrl);
