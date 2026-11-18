import { ErrorCode } from './types';

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
export type HomeWizardErrorKind = keyof HomeWizardErrorFields;

/**
 * The fields each kind of error has. Checking `error.kind` narrows an error to its fields, so `statusCode` is a
 * number once `error.kind === 'response'`.
 */
export interface HomeWizardErrorFields {
  response: {
    /** The error code from the device, for example `user:unauthorized`. Upstream may add codes. */
    code?: ErrorCode;
    /** The URL of the request. */
    url: string;
    /** The HTTP status. */
    statusCode: number;
    /** The raw response body. */
    response: string;
  };
  timeout: {
    /** The URL of the request. */
    url: string;
    /** The timeout in milliseconds that passed. */
    timeout: number;
  };
  network: {
    /** The URL of the request. Missing when discovery failed. */
    url?: string;
  };
  certificate: {
    /** The URL of the request. Missing when the identifier was refused before a request. */
    url?: string;
  };
  pairing: {
    /** Why the pairing ended. */
    reason: 'timeout' | 'aborted';
  };
  socket: {
    /** The error code from the device, when it sent one. */
    code?: ErrorCode;
  };
  invalid: object;
}

type HomeWizardErrorField = {
  [K in HomeWizardErrorKind]: keyof HomeWizardErrorFields[K];
}[HomeWizardErrorKind];

/** An error of one kind: its own fields, and the fields of the other kinds as `undefined`. */
export type HomeWizardErrorOf<K extends HomeWizardErrorKind> = Error & {
  readonly kind: K;
} & Readonly<HomeWizardErrorFields[K]> & {
    readonly [F in Exclude<HomeWizardErrorField, keyof HomeWizardErrorFields[K]>]?: undefined;
  };

/** The fields to create an error of one kind with, plus the error that caused it. */
export type HomeWizardErrorDetails<K extends HomeWizardErrorKind> = HomeWizardErrorFields[K] & {
  cause?: unknown;
};

interface HomeWizardErrorConstructor {
  /** The details are required for the kinds that have required fields. */
  new <K extends HomeWizardErrorKind>(
    kind: K,
    message: string,
    ...details: object extends HomeWizardErrorFields[K]
      ? [details?: HomeWizardErrorDetails<K>]
      : [details: HomeWizardErrorDetails<K>]
  ): HomeWizardErrorOf<K>;
  readonly prototype: HomeWizardError;
}

/**
 * The one error the library throws, and the WebSocket emits. `kind` says what went wrong, and `code` has the
 * error code the device sent, when it sent one. Checking `kind` narrows the error to the fields of that kind:
 * see `HomeWizardErrorFields`. More kinds may be added in a minor version, so handle other values too.
 *
 * @example
 * try {
 *   await p1.getMeasurement();
 * } catch (error) {
 *   if (error instanceof HomeWizardError && error.code === 'user:unauthorized') {
 *     // The token was deleted: pair again
 *   }
 *
 *   if (error instanceof HomeWizardError && error.kind === 'response') {
 *     console.log(error.statusCode, error.response);
 *   }
 * }
 *
 * @link https://api-documentation.homewizard.com/docs/v2/error-handling
 */
export type HomeWizardError = {
  [K in HomeWizardErrorKind]: HomeWizardErrorOf<K>;
}[HomeWizardErrorKind];

export const HomeWizardError = class HomeWizardError extends Error {
  readonly kind: HomeWizardErrorKind;

  constructor(kind: HomeWizardErrorKind, message: string, details: { cause?: unknown } = {}) {
    const { cause, ...fields } = details;

    super(message, cause === undefined ? undefined : { cause });
    this.name = 'HomeWizardError';
    this.kind = kind;
    Object.assign(this, fields);
  }
} as unknown as HomeWizardErrorConstructor;

/** Returns `true` for the errors that can go away on their own, such as a reboot or bad Wi-Fi: timeouts and network errors. */
export function isTransientError(error: HomeWizardError): boolean {
  return error.kind === 'timeout' || error.kind === 'network';
}
