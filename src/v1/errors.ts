import { describeFailure, RequestErrors } from '../shared/request';
import { ErrorResponse } from './types';

function parseApiError(response: string): ErrorResponse['error'] | undefined {
  try {
    const parsed = JSON.parse(response) as Partial<ErrorResponse> | null;
    const error = parsed?.error;

    if (typeof error?.id === 'number' && typeof error.description === 'string') {
      return error;
    }
  } catch {
    // Not a JSON error body
  }

  return undefined;
}

export class HomeWizardEnergyApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HomeWizardEnergyApiError';
  }
}

export class HomeWizardEnergyApiResponseError extends HomeWizardEnergyApiError {
  url: string;
  statusCode: number;
  /** The raw response body. */
  response: string;
  /**
   * The parsed error when the response body is the API's JSON error object, for example
   * `{ id: ErrorCodes.INVALID_VALUE_FOR_PARAMETER, description: 'brightness value limited to 0-255' }`.
   * It is `undefined` for plain-text bodies, such as errors from `/api/v1/telegram`, and for the `text/html` 404 and 405
   * responses the device sends for a path it doesn't know or a method an endpoint doesn't accept.
   *
   * @link https://api-documentation.homewizard.com/docs/v1/error-handling
   */
  apiError?: ErrorResponse['error'];

  constructor(message: string, url: string, statusCode: number, response: string) {
    super(message);
    this.name = 'HomeWizardEnergyApiResponseError';
    this.url = url;
    this.statusCode = statusCode;
    this.response = response;
    this.apiError = parseApiError(response);
  }
}

/**
 * Thrown when a request takes longer than the `timeout` option, for example when the device is unreachable.
 */
export class HomeWizardEnergyApiTimeoutError extends HomeWizardEnergyApiError {
  url: string;
  /** The timeout in milliseconds that was exceeded. */
  timeout: number;

  constructor(message: string, url: string, timeout: number) {
    super(message);
    this.name = 'HomeWizardEnergyApiTimeoutError';
    this.url = url;
    this.timeout = timeout;
  }
}

/** The errors of the API v1 for a failed request, for `requestWithTimeout()` and `readResponse()`. */
export const requestErrors: RequestErrors = {
  timeout: (message, url, timeout) => new HomeWizardEnergyApiTimeoutError(message, url, timeout),
  status: (method, url, statusCode, body) =>
    new HomeWizardEnergyApiResponseError(
      describeFailure(method, url, statusCode, body),
      url,
      statusCode,
      body,
    ),
  invalidJson: (message, url, statusCode, body) =>
    new HomeWizardEnergyApiResponseError(message, url, statusCode, body),
};
