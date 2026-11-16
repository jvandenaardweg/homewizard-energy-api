import { HomeWizardEnergyApiError, HomeWizardEnergyApiResponseError } from '@/shared/errors';
import { ErrorCode, ErrorResponse } from './types';

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
 * Thrown when a device responds with an error status. `code` is the API v2 error code, when the body has one.
 *
 * It extends `HomeWizardEnergyApiResponseError`, so code that catches the v1 errors also catches these.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/error-handling
 */
export class HomeWizardApiV2Error extends HomeWizardEnergyApiResponseError {
  /** The error code, for example `user:unauthorized`. Upstream may add codes, so handle other values too. */
  code?: ErrorCode;

  constructor(message: string, url: string, statusCode: number, response: string) {
    super(message, url, statusCode, response);
    this.name = 'HomeWizardApiV2Error';
    this.code = parseErrorCode(response);
  }
}

/**
 * Thrown by `pair()` when the button on the device isn't pressed in time, or the pairing is aborted.
 */
export class HomeWizardApiV2PairingError extends HomeWizardEnergyApiError {
  reason: 'timeout' | 'aborted';

  constructor(message: string, reason: 'timeout' | 'aborted') {
    super(message);
    this.name = 'HomeWizardApiV2PairingError';
    this.reason = reason;
  }
}

/**
 * Thrown by the WebSocket: for an error message from the device (with its `code`), or when the connection
 * can't be authorized.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/websocket#error-handling
 */
export class HomeWizardApiV2WebSocketError extends HomeWizardEnergyApiError {
  code?: ErrorCode;

  constructor(message: string, code?: ErrorCode) {
    super(message);
    this.name = 'HomeWizardApiV2WebSocketError';
    this.code = code;
  }
}
