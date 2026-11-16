import { mockApiPool } from './api';

export const mockTokenV2 = '0123456789ABCDEF0123456789ABCDEF';
export const mockUserNameV2 = 'local/my-app';

export interface MockedRequestV2 {
  path: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/** The requests received by the mocked API v2, most recent last. */
export const mockedRequestsV2: MockedRequestV2[] = [];

interface ApiV2MockOptions {
  statusCode?: number;
  response?: object | string;
}

const intercept =
  (path: string, method: string) =>
  ({ statusCode, response }: ApiV2MockOptions = {}) => {
    mockApiPool
      .intercept({
        path,
        method,
      })
      .reply(({ headers, body }) => {
        mockedRequestsV2.push({
          path,
          method,
          headers: headers as Record<string, string>,
          body: typeof body === 'string' && body ? JSON.parse(body) : body,
        });

        return {
          data: response === undefined ? '' : response,
          statusCode: statusCode || (response === undefined ? 204 : 200),
        };
      });
  };

export const apiV2Mocks = {
  getBasicInformation: intercept('/api', 'GET'),
  getData: intercept('/api/measurement', 'GET'),
  createUser: intercept('/api/user', 'POST'),
  getUsers: intercept('/api/user', 'GET'),
  deleteUser: intercept('/api/user', 'DELETE'),
  getSystem: intercept('/api/system', 'GET'),
  updateSystem: intercept('/api/system', 'PUT'),
  identify: intercept('/api/system/identify', 'PUT'),
  reboot: intercept('/api/system/reboot', 'PUT'),
  getBatteries: intercept('/api/batteries', 'GET'),
  updateBatteries: intercept('/api/batteries', 'PUT'),
  getTelegram: intercept('/api/telegram', 'GET'),
};
