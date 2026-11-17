import {
  describeCall,
  describeFailure,
  InvalidJsonErrorFactory,
  TimeoutErrorFactory,
} from '@/shared/request';
import { isCertificateError } from './tls';
import { ErrorCode, ErrorResponse } from './types';

/**
 * What went wrong:
 *
 * - `response`: the device answered with an error status, or a body that isn't valid JSON. `code` has the
 *   error code, and `statusCode` and `response` the status and the raw body.
 * - `timeout`: the device didn't answer within the `timeout` option.
 * - `network`: the connection failed, for example because the device is offline. `cause` has the error.
 * - `certificate`: the certificate isn't from HomeWizard, or is issued to another identifier than the stored
 *   one, so the token wasn't sent. Another device may answer at this address. `connect()` throws it too, for a
 *   device announced with another identifier.
 * - `pairing`: the button on the device wasn't pressed in time (`reason: 'timeout'`), or the pairing was
 *   aborted (`reason: 'aborted'`).
 * - `socket`: the WebSocket failed or the device sent an error over it, with its `code`.
 * - `invalid`: the arguments or options can't work, for example a missing identifier or an `http://` host.
 */
export type HomeWizardErrorKind =
  'response' | 'timeout' | 'network' | 'certificate' | 'pairing' | 'socket' | 'invalid';

export type HomeWizardErrorDetails = Partial<
  Pick<HomeWizardError, 'code' | 'url' | 'statusCode' | 'response' | 'timeout' | 'reason'>
> & { cause?: unknown };

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

/**
 * The one error the library throws, and the WebSocket emits. `kind` says what went wrong, and `code` has the
 * error code the device sent, when it sent one.
 *
 * @example
 * try {
 *   await p1.getMeasurement();
 * } catch (error) {
 *   if (error instanceof HomeWizardError && error.code === 'user:unauthorized') {
 *     // The token was deleted: pair again
 *   }
 * }
 *
 * @link https://api-documentation.homewizard.com/docs/v2/error-handling
 */
export class HomeWizardError extends Error {
  /** What went wrong. More kinds may be added in a minor version, so handle other values too. */
  readonly kind: HomeWizardErrorKind;
  /**
   * The error code from the device, for example `user:unauthorized`. Upstream may add codes, so handle other
   * values too.
   */
  readonly code?: ErrorCode;
  /** The URL of the request. */
  readonly url?: string;
  /** The HTTP status, for a `response` error. */
  readonly statusCode?: number;
  /** The raw response body, for a `response` error. */
  readonly response?: string;
  /** The timeout in milliseconds that passed, for a `timeout` error. */
  readonly timeout?: number;
  /** Why the pairing ended, for a `pairing` error. */
  readonly reason?: 'timeout' | 'aborted';

  constructor(kind: HomeWizardErrorKind, message: string, details: HomeWizardErrorDetails = {}) {
    const { cause, ...fields } = details;

    super(message, cause === undefined ? undefined : { cause });
    this.name = 'HomeWizardError';
    this.kind = kind;
    Object.assign(this, fields);
  }
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

/** Creates the `response` error for a body that isn't valid JSON, for `parseJsonResponse()`. */
export const createInvalidJsonError: InvalidJsonErrorFactory = (
  message,
  url,
  statusCode,
  response,
) => new HomeWizardError('response', message, { url, statusCode, response });

/** Wraps a network or certificate error from a request in a `HomeWizardError`, and keeps a `HomeWizardError`. */
export function toHomeWizardError(error: unknown, method: string, url: string): HomeWizardError {
  if (error instanceof HomeWizardError) return error;

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
