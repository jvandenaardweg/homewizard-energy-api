import { IncomingHttpHeaders } from 'http';
import { mockApiAgent } from './api';

/*
 * Interceptors for the API v2. The tests pass `mockApiAgent` as the `dispatcher` option, because the device
 * classes otherwise use their own TLS agent instead of the global dispatcher.
 */

export const mockV2Host = '192.168.1.35';
export const mockV2Url = `https://${mockV2Host}`;
export const mockV2Pool = mockApiAgent.get(mockV2Url);

export interface MockV2Request {
  headers: Record<string, string>;
  body: unknown;
}

export interface MockV2Options {
  statusCode?: number;
  /** An object or array is sent as JSON, a string as plain text, `undefined` as an empty body. */
  response?: unknown;
  /** Receives each intercepted request, to check its headers and body. */
  onRequest?: (request: MockV2Request) => void;
  /** Extra response headers, such as `x-api-version`. */
  headers?: Record<string, string>;
}

function toHeaderRecord(headers: unknown): Record<string, string> {
  const record: Record<string, string> = {};

  for (const [key, value] of Object.entries((headers ?? {}) as IncomingHttpHeaders)) {
    record[key.toLowerCase()] = String(value);
  }

  return record;
}

/** Intercepts one request to `path`. */
export function mockV2(path: string, method: string, options: MockV2Options = {}): void {
  const { statusCode = 200, response, onRequest, headers = {} } = options;

  mockV2Pool.intercept({ path, method }).reply(request => {
    onRequest?.({
      headers: toHeaderRecord(request.headers),
      body: typeof request.body === 'string' ? JSON.parse(request.body) : undefined,
    });

    if (response === undefined) {
      return { statusCode, data: '', responseOptions: { headers } };
    }

    if (typeof response === 'string') {
      return {
        statusCode,
        data: response,
        responseOptions: { headers: { 'content-type': 'text/plain', ...headers } },
      };
    }

    return {
      statusCode,
      data: JSON.stringify(response),
      responseOptions: { headers: { 'content-type': 'application/json', ...headers } },
    };
  });
}

/** The options for a device in the tests: the mock agent, an identifier and a token. */
/** The credentials of the mocked device, as `pair()` returns them. */
export const mockV2Credentials = {
  host: mockV2Host,
  identifier: 'appliance/p1dongle/5c2fafaabbcc',
  token: '0123456789ABCDEF0123456789ABCDEF',
};

/** The options for the internal `Client`: the credentials without the host, and the mock dispatcher. */
export const mockV2DeviceOptions = {
  dispatcher: mockApiAgent,
  identifier: mockV2Credentials.identifier,
  token: mockV2Credentials.token,
};
