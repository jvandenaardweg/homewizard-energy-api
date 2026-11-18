import {
  describeCall,
  describeFailure,
  InvalidJsonErrorFactory,
  RequestErrors,
  TimeoutErrorFactory,
} from '@/shared/request';
import { HomeWizardError } from './errors';
import { ErrorCode, ErrorResponse } from './types';

/*
 * Turns what can go wrong between the library and a device into a `HomeWizardError` of the right kind, with the
 * original as `cause`: a timeout, an error status, a body that isn't JSON, a refused certificate, or any other
 * failed connection. The requests (`Client`) and the WebSocket (`Connection`) both use it. The message text of a
 * request comes from `src/shared/request.ts`, which the API v1 shares.
 */

/** Where a transport failure happened: a request, or the WebSocket connection. */
export type Transport =
  { type: 'request'; method: string; url: string } | { type: 'websocket'; url: string };

/**
 * Returns `true` for a failed certificate check: a certificate not signed by the CA (OpenSSL codes such as
 * `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or `SELF_SIGNED_CERT_IN_CHAIN`), or one issued to another identifier
 * (`CERTIFICATE_IDENTITY_ERROR_CODE`).
 */
function isCertificateError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;

  return typeof code === 'string' && /CERT|SIGNATURE|ISSUER/.test(code);
}

/**
 * Wraps a failed connection in a `HomeWizardError`, and keeps a `HomeWizardError`. For a request it's a
 * `certificate` error when the certificate was refused, and a `network` error otherwise.
 *
 * The WebSocket always gets a `socket` error: undici's WebSocket reports every failed connection as an empty
 * `TypeError`, without the TLS or network error, so there is nothing to tell a refused certificate apart by.
 */
export function toHomeWizardError(error: unknown, transport: Transport): HomeWizardError {
  if (error instanceof HomeWizardError) return error;

  if (transport.type === 'websocket') {
    const detail = error instanceof Error && error.message ? `: ${error.message}` : '';

    return new HomeWizardError('socket', `The WebSocket connection failed${detail}`, {
      cause: error,
    });
  }

  const { method, url } = transport;
  const detail = error instanceof Error ? error.message : String(error);

  if (isCertificateError(error)) {
    return new HomeWizardError(
      'certificate',
      `The certificate of the device at ${url} was refused: ${detail}`,
      { url, cause: error },
    );
  }

  return new HomeWizardError('network', `${describeCall(method, url)} failed: ${detail}`, {
    url,
    cause: error,
  });
}

/** Reads the error code from a JSON body (`{"error": "user:unauthorized"}`) or a plain-text body. */
export function parseErrorCode(body: string): ErrorCode | undefined {
  try {
    const parsed = JSON.parse(body) as Partial<ErrorResponse> | null;

    if (typeof parsed?.error === 'string') return parsed.error;
  } catch {
    // Not JSON: the telegram endpoint sends the code as plain text
  }

  const text = body.trim();

  return /^[a-z]+:[a-z0-9-]+(:\S+)?$/.test(text) ? text : undefined;
}

/** Returns a `response` error for an error status, with the code from the body. */
export function createResponseError(
  method: string,
  url: string,
  statusCode: number,
  body: string,
): HomeWizardError {
  return new HomeWizardError('response', describeFailure(method, url, statusCode, body), {
    url,
    statusCode,
    response: body,
    code: parseErrorCode(body),
  });
}

/** Creates the `timeout` error for `requestWithTimeout()`. */
export const createTimeoutError: TimeoutErrorFactory = (message, url, timeout) =>
  new HomeWizardError('timeout', message, { url, timeout });

/** Creates the `response` error for a body that isn't valid JSON. */
export const createInvalidJsonError: InvalidJsonErrorFactory = (
  message,
  url,
  statusCode,
  response,
) => new HomeWizardError('response', message, { url, statusCode, response });

/** The errors of a failed request, for `requestWithTimeout()` and `readResponse()` in `src/shared/request.ts`. */
export const requestErrors: RequestErrors = {
  timeout: createTimeoutError,
  status: createResponseError,
  invalidJson: createInvalidJsonError,
};
