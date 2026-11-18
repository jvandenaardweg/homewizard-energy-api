import { HomeWizardError } from './errors';
import { createResponseError } from './transport-errors';

describe('errors', () => {
  describe('HomeWizardError', () => {
    it('should set the kind, the details and the cause', () => {
      const cause = new Error('socket hang up');
      const error = new HomeWizardError('network', 'failed', { url: 'https://x/api', cause });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('HomeWizardError');
      expect(error.kind).toBe('network');
      expect(error.url).toBe('https://x/api');
      expect(error.cause).toBe(cause);
      expect(new HomeWizardError('invalid', 'bad').cause).toBeUndefined();
    });

    it('should set the code, the status and the body of a response error', () => {
      const error = createResponseError(
        'GET',
        'https://x/api',
        401,
        '{"error":"user:unauthorized"}',
      );

      expect(error.kind).toBe('response');
      expect(error.code).toBe('user:unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.response).toBe('{"error":"user:unauthorized"}');
      expect(error.message).toBe(
        'Api GET call at https://x/api failed with status 401 and response data: {"error":"user:unauthorized"}',
      );
    });
  });

  it('should narrow the fields by kind', () => {
    const error: HomeWizardError = createResponseError('GET', 'https://x/api', 401, '{}');

    // Readable on any error, without narrowing
    const code: string | undefined = error.code;
    expect(code).toBeUndefined();

    expect(error.kind).toBe('response');
    if (error.kind === 'response') {
      // Only compiles when the kind narrows statusCode from `number | undefined` to `number`
      const statusCode: number = error.statusCode;
      expect(statusCode).toBe(401);
    }

    // @ts-expect-error a timeout error needs its url and timeout
    expect(new HomeWizardError('timeout', 'slow').timeout).toBeUndefined();
    // @ts-expect-error a pairing error has no statusCode to set
    const pairing = new HomeWizardError('pairing', 'x', { reason: 'aborted', statusCode: 1 });
    expect(pairing.reason).toBe('aborted');
  });
});
