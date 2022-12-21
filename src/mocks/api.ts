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

interface ApiMockOptions<TResponse extends object> {
  statusCode?: number;
  response: TResponse | object | string;
}

type ApiMockHandler = <TResponse extends object>(options: ApiMockOptions<TResponse>) => void;

interface ApiMocks {
  [key: string]: ApiMockHandler;
}

export const apiMocks: ApiMocks = {
  getBasicInformation: ({ statusCode, response }) => {
    mockApiPool
      .intercept({
        path: '/api',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
      }));
  },
  getData: ({ statusCode, response }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/data',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
      }));
  },
  getSystem: ({ statusCode, response }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/system',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
      }));
  },
  getTelegram: ({ statusCode, response }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/telegram',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
      }));
  },
  updateSystem: ({ statusCode, response }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/system',
        method: 'PUT',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
      }));
  },
  getState: ({ statusCode, response }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/state',
        method: 'GET',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
      }));
  },
  updateState: ({ statusCode, response }) => {
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
        };
      });
  },
  identify: ({ statusCode, response }) => {
    mockApiPool
      .intercept({
        path: '/api/v1/identify',
        method: 'PUT',
      })
      .reply(() => ({
        data: response,
        statusCode: statusCode || 200,
      }));
  },
};
