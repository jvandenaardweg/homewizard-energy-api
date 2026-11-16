import { MockAgent } from 'undici';
import { SupportedDevices } from '../types';

export const mockHostname = 'localhost';
export const mockApiUrl = `http://${mockHostname}`;
export const mockSerialNumber = '1234567890';
export const mockFirmwareVersion = '4.08';
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

interface ApiMockOptions<TResponse extends object> {
  statusCode?: number;
  response: TResponse | object | string;
  /** Response headers. Defaults to the content type the device sends for the endpoint. */
  headers?: Record<string, string>;
}

// The devices answer JSON endpoints with application/json and the telegram with text/plain.
// Errors from the device's router, like a 404 for an unknown path, are text/html.
const JSON_HEADERS = { 'content-type': 'application/json' };
const TEXT_HEADERS = { 'content-type': 'text/plain' };
export const HTML_HEADERS = { 'content-type': 'text/html' };

type ApiMockHandler = <TResponse extends object>(options: ApiMockOptions<TResponse>) => void;

interface ApiMocks {
  [key: string]: ApiMockHandler;
}

interface MockEndpointOptions {
  /** The content type the device sends for this endpoint. Defaults to JSON. */
  defaultHeaders?: Record<string, string>;
  /** Reply with a 400 when the request has no body, like the device does for a PUT without one. */
  requireBody?: boolean;
}

/**
 * Returns a mock handler for one endpoint. Each call intercepts a single request.
 */
function mockEndpoint(
  path: string,
  method: 'GET' | 'PUT',
  { defaultHeaders = JSON_HEADERS, requireBody = false }: MockEndpointOptions = {},
): ApiMockHandler {
  return ({ statusCode, response, headers }) => {
    mockApiPool.intercept({ path, method }).reply(({ body }) => {
      if (requireBody && !body) {
        return {
          statusCode: 400,
        };
      }

      return {
        data: response,
        statusCode: statusCode || 200,
        responseOptions: { headers: headers || defaultHeaders },
      };
    });
  };
}

export const apiMocks: ApiMocks = {
  getBasicInformation: mockEndpoint('/api', 'GET'),
  getData: mockEndpoint('/api/v1/data', 'GET'),
  getSystem: mockEndpoint('/api/v1/system', 'GET'),
  getTelegram: mockEndpoint('/api/v1/telegram', 'GET', { defaultHeaders: TEXT_HEADERS }),
  updateSystem: mockEndpoint('/api/v1/system', 'PUT'),
  getState: mockEndpoint('/api/v1/state', 'GET'),
  updateState: mockEndpoint('/api/v1/state', 'PUT', { requireBody: true }),
  identify: mockEndpoint('/api/v1/identify', 'PUT'),
};
