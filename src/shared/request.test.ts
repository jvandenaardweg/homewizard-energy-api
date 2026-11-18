import { mockApiAgent } from '@/mocks/agent';
import { readResponse, RequestErrors, requestWithTimeout } from './request';

/*
 * The request code that the API v1 and the root API share, each with its own errors. These errors record what
 * they were created with, so the tests see what each adapter gets.
 */

const origin = 'http://shared.test';
const url = `${origin}/api`;
const pool = mockApiAgent.get(origin);

class TestError extends Error {
  constructor(
    readonly type: string,
    message: string,
    readonly details: unknown[],
  ) {
    super(message);
  }
}

const errors: RequestErrors = {
  timeout: (message, ...details) => new TestError('timeout', message, details),
  status: (method, errorUrl, statusCode, body) =>
    new TestError('status', `${method} ${errorUrl}`, [statusCode, body]),
  invalidJson: (message, ...details) => new TestError('invalidJson', message, details),
};

async function respond(statusCode: number, body: string, method = 'GET') {
  pool.intercept({ path: '/api', method }).reply(statusCode, body);

  return requestWithTimeout(url, { method }, 0, errors);
}

describe('readResponse()', () => {
  it('should return the JSON body', async () => {
    const response = await respond(200, '{"power_w":5}');

    await expect(readResponse(response, { method: 'GET', url }, errors)).resolves.toStrictEqual({
      power_w: 5,
    });
  });

  it('should return the text body', async () => {
    const response = await respond(200, '/XMX5LGF', 'PUT');

    await expect(readResponse(response, { method: 'PUT', url }, errors, 'text')).resolves.toBe(
      '/XMX5LGF',
    );
  });

  it.each(['json', 'text'] as const)(
    'should throw the status error with the body for an error status, as %s',
    async as => {
      const response = await respond(503, 'busy');

      await expect(
        readResponse(response, { method: 'GET', url }, errors, as as 'text'),
      ).rejects.toMatchObject({ type: 'status', message: `GET ${url}`, details: [503, 'busy'] });
    },
  );

  it('should throw the invalid JSON error with the body', async () => {
    const response = await respond(200, '<html>');

    await expect(readResponse(response, { method: 'GET', url }, errors)).rejects.toMatchObject({
      type: 'invalidJson',
      message: `Api GET call at ${url} returned a response that is not valid JSON: <html>`,
      details: [url, 200, '<html>'],
    });
  });
});

describe('requestWithTimeout()', () => {
  it('should throw the timeout error once the timeout passes', async () => {
    pool.intercept({ path: '/api', method: 'GET' }).reply(200, '{}').delay(100);

    const request = requestWithTimeout(url, { method: 'GET' }, 10, errors);
    const assertion = expect(request).rejects.toMatchObject({
      type: 'timeout',
      message: `Api GET call at ${url} timed out after 10ms`,
      details: [url, 10],
    });

    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });
});
