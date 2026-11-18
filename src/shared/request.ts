import { Dispatcher, request as undiciRequest } from 'undici';

export type RequestParameters = Parameters<typeof undiciRequest>;

/** Until the response headers arrive, including connecting, which undici otherwise allows 10 seconds for. */
export const DEFAULT_TIMEOUT = 5000;

/** Describes a request for error messages, for example `Api GET call at http://192.168.1.35/api/v1/data`. */
export function describeCall(method: string, url: RequestParameters[0]): string {
  return `Api ${method} call at ${url}`;
}

/**
 * Aborts `controller` after `ms` milliseconds, then rejects `promise` with the error from `createError`.
 * `cancel()` stops the timer, after which `promise` never settles.
 */
function abortAfter(ms: number, controller: AbortController, createError: () => Error) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const promise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(createError());
    }, ms);
  });

  return { promise, cancel: () => clearTimeout(timer) };
}

/** Creates the error for a request that timed out. The API v1 and the root API each throw their own class. */
export type TimeoutErrorFactory = (message: string, url: string, timeout: number) => Error;

/** Creates the error for an error status, with the message from `describeFailure()`. */
export type StatusErrorFactory = (
  method: string,
  url: string,
  statusCode: number,
  body: string,
) => Error;

/** Creates the error for a response body that isn't valid JSON. */
export type InvalidJsonErrorFactory = (
  message: string,
  url: string,
  statusCode: number,
  body: string,
) => Error;

/**
 * The errors of a failed request, which the API v1 and the root API each create with their own classes: a
 * timeout, an error status, and a body that isn't valid JSON.
 */
export interface RequestErrors {
  timeout: TimeoutErrorFactory;
  status: StatusErrorFactory;
  invalidJson: InvalidJsonErrorFactory;
}

/**
 * Sends a request with undici. When `timeout` is set, the call throws the `timeout` error of `errors` once it
 * passes before the response headers arrive. A `signal` in `options` takes precedence over the timeout.
 */
export async function requestWithTimeout(
  url: RequestParameters[0],
  options: RequestParameters[1],
  timeout: number,
  errors: Pick<RequestErrors, 'timeout'>,
): Promise<Dispatcher.ResponseData<unknown>> {
  // A signal from the user takes precedence over the timeout
  if (!timeout || options?.signal) {
    return undiciRequest(url, options);
  }

  const controller = new AbortController();

  // Since undici 7, aborting doesn't interrupt a pending connect, which undici allows 10 seconds for.
  // So the timeout settles the call itself, and the abort only cleans up the request.
  const timeoutError = abortAfter(timeout, controller, () =>
    errors.timeout(
      `${describeCall(options?.method || 'GET', url)} timed out after ${timeout}ms`,
      String(url),
      timeout,
    ),
  );

  try {
    // The race also handles the request rejecting after the timeout, so that isn't unhandled
    return await Promise.race([
      undiciRequest(url, { ...options, signal: controller.signal }),
      timeoutError.promise,
    ]);
  } catch (error) {
    if (controller.signal.aborted) {
      // The abort can reject the request just before the timeout error
      return timeoutError.promise;
    }

    throw error;
  } finally {
    timeoutError.cancel();
  }
}

/** The message of an error response, for example `Api GET call at … failed with status 500 and response data: …`. */
export function describeFailure(
  method: string,
  url: RequestParameters[0],
  statusCode: number,
  body: string,
): string {
  return `${describeCall(method, url)} failed with status ${statusCode} and response data: ${body}`;
}

export function isResponseOk(response: Dispatcher.ResponseData<unknown>): boolean {
  return response.statusCode >= 200 && response.statusCode < 300;
}

/** The request a response answers, for the error messages. */
export interface RequestCall {
  method: string;
  url: string;
}

/**
 * Reads the body of a response: as JSON, or as text with `as: 'text'`. It throws the `status` error of `errors`
 * for a status outside 2xx, and the `invalidJson` error for a body that isn't valid JSON, instead of a bare
 * `SyntaxError`. Both have the URL and the raw body. The body is read in full either way, so the connection can be
 * reused.
 */
export async function readResponse(
  response: Dispatcher.ResponseData<unknown>,
  call: RequestCall,
  errors: RequestErrors,
  as: 'text',
): Promise<string>;
export async function readResponse<T>(
  response: Dispatcher.ResponseData<unknown>,
  call: RequestCall,
  errors: RequestErrors,
  as?: 'json',
): Promise<T>;
export async function readResponse<T>(
  response: Dispatcher.ResponseData<unknown>,
  call: RequestCall,
  errors: RequestErrors,
  as: 'json' | 'text' = 'json',
): Promise<T | string> {
  if (!isResponseOk(response)) {
    throw errors.status(call.method, call.url, response.statusCode, await response.body.text());
  }

  if (as === 'text') return response.body.text();

  return parseJsonResponse<T>(response, call, errors);
}

/**
 * Reads the body of a response as JSON, whatever its status. A body that isn't valid JSON throws the
 * `invalidJson` error of `errors` instead of a bare `SyntaxError`, so it has the URL and the raw body.
 */
export async function parseJsonResponse<T>(
  response: Dispatcher.ResponseData<unknown>,
  { method, url }: RequestCall,
  errors: Pick<RequestErrors, 'invalidJson'>,
): Promise<T> {
  const text = await response.body.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw errors.invalidJson(
      `${describeCall(method, url)} returned a response that is not valid JSON: ${text}`,
      url,
      response.statusCode,
      text,
    );
  }
}
