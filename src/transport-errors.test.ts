import { mockApiAgent } from '@/mocks/agent';
import { mockV2, mockV2DeviceOptions, mockV2Host, mockV2Url } from '@/mocks/api-v2';
import { Client } from './client';
import { HomeWizardError, HomeWizardErrorKind } from './errors';
import { CERTIFICATE_IDENTITY_ERROR_CODE } from './tls';
import {
  createInvalidJsonError,
  createTimeoutError,
  parseErrorCode,
  toHomeWizardError,
} from './transport-errors';
import { Connection } from './websocket/connection';

/*
 * What a failed connection becomes, through the requests of `Client` and through the WebSocket `Connection`. The
 * real TLS failures behind these rows are tested over a real handshake in devices.test.ts and
 * device-socket.test.ts. Timeouts and error statuses are in client.test.ts.
 */

const { FakeWebSocket } = vi.hoisted(() => {
  class FakeWebSocket {
    static last: FakeWebSocket;
    onmessage: unknown = null;
    onerror: ((event: { error?: unknown }) => void) | null = null;
    onclose: unknown = null;

    constructor() {
      FakeWebSocket.last = this;
    }
  }

  return { FakeWebSocket };
});

vi.mock('undici', async importOriginal => ({
  ...(await importOriginal<typeof import('undici')>()),
  WebSocket: FakeWebSocket,
}));

const url = `${mockV2Url}/api`;
const withCode = (message: string, code: unknown) => Object.assign(new Error(message), { code });

/** Sends a POST, which isn't retried, that fails with `cause` once the response arrives. */
async function failRequest(cause: unknown): Promise<HomeWizardError> {
  mockV2('/api', 'POST');
  const client = new Client(mockV2Host, mockV2DeviceOptions);

  return client.send('POST', '/api', {}, () => Promise.reject(cause)).catch(error => error);
}

/** Opens a connection whose WebSocket fails with an error event that carries `cause`. */
function failWebSocket(cause: unknown): HomeWizardError {
  const onError = vi.fn<(error: HomeWizardError) => void>();
  const target = {
    url: 'wss://192.168.1.35/api/ws',
    token: 'T',
    dispatcher: mockApiAgent,
    logger: undefined,
  };

  new Connection(target, 0, {
    onMessage: vi.fn(),
    onAuthorized: vi.fn(),
    onError,
    onClose: vi.fn(),
  });
  FakeWebSocket.last.onerror?.(cause === undefined ? {} : { error: cause });

  return onError.mock.calls[0][0];
}

interface Row {
  failure: string;
  cause: unknown;
  request: [HomeWizardErrorKind, string];
  webSocket: [HomeWizardErrorKind, string];
}

const table: Row[] = [
  {
    failure: 'a certificate of another identifier',
    cause: withCode('issued to "x"', CERTIFICATE_IDENTITY_ERROR_CODE),
    request: ['certificate', `The certificate of the device at ${url} was refused: issued to "x"`],
    webSocket: ['socket', 'The WebSocket connection failed: issued to "x"'],
  },
  ...[
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  ].map((code): Row => ({
    failure: `a certificate the CA didn't sign (${code})`,
    cause: withCode('untrusted', code),
    request: ['certificate', `The certificate of the device at ${url} was refused: untrusted`],
    webSocket: ['socket', 'The WebSocket connection failed: untrusted'],
  })),
  {
    failure: 'a refused connection',
    cause: withCode('connect ECONNREFUSED', 'ECONNREFUSED'),
    request: ['network', `Api POST call at ${url} failed: connect ECONNREFUSED`],
    webSocket: ['socket', 'The WebSocket connection failed: connect ECONNREFUSED'],
  },
  {
    failure: 'an error with a code that is not a string',
    cause: withCode('odd', 1),
    request: ['network', `Api POST call at ${url} failed: odd`],
    webSocket: ['socket', 'The WebSocket connection failed: odd'],
  },
  {
    failure: 'an error without a message, as undici reports any failed WebSocket',
    cause: new TypeError(''),
    request: ['network', `Api POST call at ${url} failed: `],
    webSocket: ['socket', 'The WebSocket connection failed'],
  },
  {
    failure: 'a thrown string',
    cause: 'offline',
    request: ['network', `Api POST call at ${url} failed: offline`],
    webSocket: ['socket', 'The WebSocket connection failed'],
  },
  {
    failure: 'null',
    cause: null,
    request: ['network', `Api POST call at ${url} failed: null`],
    webSocket: ['socket', 'The WebSocket connection failed'],
  },
  {
    failure: 'nothing',
    cause: undefined,
    request: ['network', `Api POST call at ${url} failed: undefined`],
    webSocket: ['socket', 'The WebSocket connection failed'],
  },
];

describe('v2/transport-errors', () => {
  describe.each(table)('$failure', ({ cause, request, webSocket }) => {
    it('should become its kind on a request, with the cause', async () => {
      const error = await failRequest(cause);

      expect(error).toBeInstanceOf(HomeWizardError);
      expect([error.kind, error.message]).toStrictEqual(request);
      expect(error.url).toBe(url);
      expect(error.cause).toBe(cause);
    });

    it('should become its kind on the WebSocket, with the cause', () => {
      const error = failWebSocket(cause);

      expect(error).toBeInstanceOf(HomeWizardError);
      expect([error.kind, error.message]).toStrictEqual(webSocket);
      expect(error.cause).toBe(cause);
    });
  });

  it('should keep a HomeWizardError', async () => {
    const error = new HomeWizardError('invalid', 'bad');

    await expect(failRequest(error)).resolves.toBe(error);
    expect(toHomeWizardError(error, { type: 'websocket', url: 'wss://x/api/ws' })).toBe(error);
  });

  describe('parseErrorCode', () => {
    it('should read the code from a JSON body', () => {
      expect(parseErrorCode('{"error":"user:unauthorized"}')).toBe('user:unauthorized');
      expect(
        parseErrorCode('{"error":"json:parameter-invalid-type:status_led_brightness_pct"}'),
      ).toBe('json:parameter-invalid-type:status_led_brightness_pct');
    });

    it('should read the code from a plain-text body', () => {
      expect(parseErrorCode('telegram:no-telegram-received\n')).toBe(
        'telegram:no-telegram-received',
      );
    });

    it('should return undefined for a body without a code', () => {
      expect(parseErrorCode('')).toBeUndefined();
      expect(parseErrorCode('null')).toBeUndefined();
      expect(parseErrorCode('{"error":{"id":7}}')).toBeUndefined();
      expect(parseErrorCode('<html>Not Found</html>')).toBeUndefined();
    });
  });

  it('should create the timeout and invalid JSON errors for the shared request code', () => {
    expect(createTimeoutError('timed out after 5ms', 'https://x/api', 5)).toMatchObject({
      kind: 'timeout',
      message: 'timed out after 5ms',
      url: 'https://x/api',
      timeout: 5,
    });
    expect(createInvalidJsonError('not JSON', 'https://x/api', 200, '<html>')).toMatchObject({
      kind: 'response',
      statusCode: 200,
      response: '<html>',
    });
  });
});
