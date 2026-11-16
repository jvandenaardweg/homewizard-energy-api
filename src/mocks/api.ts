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

export const apiMocks: ApiMocks = {
  getBasicInformation: ({ statusCode, response, headers }) => {
    mockApiPool
      .intercept({
        path: '/api',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
        responseOptions: { headers: headers || JSON_HEADERS },
      }));
  },
  getData: ({ statusCode, response, headers }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/data',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
        responseOptions: { headers: headers || JSON_HEADERS },
      }));
  },
  getSystem: ({ statusCode, response, headers }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/system',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
        responseOptions: { headers: headers || JSON_HEADERS },
      }));
  },
  getTelegram: ({ statusCode, response, headers }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/telegram',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
        responseOptions: { headers: headers || TEXT_HEADERS },
      }));
  },
  updateSystem: ({ statusCode, response, headers }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/system',
        method: 'PUT',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
        responseOptions: { headers: headers || JSON_HEADERS },
      }));
  },
  getState: ({ statusCode, response, headers }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/state',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
        responseOptions: { headers: headers || JSON_HEADERS },
      }));
  },
  updateState: ({ statusCode, response, headers }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/state',
        method: 'PUT',
      })
      .reply(({ body }) => {
        if (!body) {
          return {
            statusCode: 400,
          };
        }

        return {
          data: response,
          statusCode: statusCode || 200,
          responseOptions: { headers: headers || JSON_HEADERS },
        };
      });
  },
  identify: ({ statusCode, response, headers }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/identify',
        method: 'PUT',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
        responseOptions: { headers: headers || JSON_HEADERS },
      }));
  },
};
