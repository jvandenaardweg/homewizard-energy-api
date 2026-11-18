import { Agent, Dispatcher } from 'undici';
import { Backoff } from '@/shared/backoff';
import { log, LoggerOptions, redact } from '@/shared/logger';
import { wait } from '@/shared/wait';
import { DEFAULT_TIMEOUT, readResponse, requestWithTimeout } from '@/shared/request';
import { HomeWizardError, isTransientError } from './errors';
import { isNewerApiVersion } from './api-version';
import type { IdentifierPolicy } from './identifier-policy';
import { requestErrors, toHomeWizardError } from './transport-errors';
import { API_MAJOR_VERSION, DOCUMENTED_API_VERSION } from './types';
import type { SocketTarget } from './websocket';

/**
 * What a device needs to connect: its address, the token and the identifier. `pair()` returns all three, so store
 * that object and pass it to the device classes.
 *
 * @example
 * const credentials = await pair('192.168.1.35', 'my-app');
 * const p1 = new P1Meter(credentials);
 */
export interface Credentials {
  /** The IP address or hostname of the device, for example `192.168.1.35`. */
  host: string;
  /**
   * The token from `pair()`. Keep it secret: it gives full access to the device.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/authorization
   */
  token: string;
  /**
   * The identifier the device's certificate is issued to, formatted as `appliance/<product type>/<serial>`.
   * Store the one `pair()` returns. `getCertificateIdentifier()` builds it from the product type and the serial on
   * the device's label. Don't take it from discovery: anyone on the network can announce a device.
   *
   * Requests fail when the certificate isn't issued to this identifier. Only with `insecure: true` may it be an
   * empty string.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/authorization#https
   */
  identifier: string;
}

/** How to connect to a device. All optional. */
export interface ConnectionOptions {
  /**
   * Skip all certificate checks, so any device at this address is accepted. Only use this for debugging.
   */
  insecure?: boolean;
  /**
   * The maximum time in milliseconds a request may take until the response headers arrive, including
   * connecting. Defaults to `5000`. Set to `0` to disable it.
   */
  timeout?: number;
  /**
   * How many times to retry a read (a `GET` request) that fails with a `timeout` or `network` error, for example
   * on a weak Wi-Fi connection. Each retry waits twice as long as the one before, starting at 500 milliseconds.
   * Defaults to `2`. Set to `0` to disable it. Requests that change something are never retried.
   */
  retries?: number;
  /** Logging options. The token is never logged. */
  logger?: LoggerOptions;
  /**
   * The undici dispatcher for the requests, for example a `MockAgent` in tests. It replaces the agent with the
   * HomeWizard certificate checks, so it must do its own checks.
   */
  dispatcher?: Dispatcher;
  /** The CA certificate (PEM) the device's certificate must be signed by. Defaults to `HOMEWIZARD_CA_CERT`. */
  ca?: string;
}

/** @internal */
export interface ClientOptions extends Omit<ConnectionOptions, 'insecure'> {
  /** Missing while pairing, which creates it. */
  token?: string;
  /** How to check the identifier in the certificate, which replaces `insecure`. */
  policy: IdentifierPolicy;
}

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE';

/** A JSON body to send, and the `Accept` header when it isn't JSON. */
export interface RequestOptions {
  body?: unknown;
  accept?: string;
}

/** The retries of a failed read, and the first delay before one. */
export const DEFAULT_RETRIES = 2;
export const RETRY_DELAY = 500;

/**
 * Normalises a host to its HTTPS origin: `192.168.1.35`, `https://192.168.1.35` and `https://192.168.1.35/`
 * all become `https://192.168.1.35`.
 */
export function toBaseUrl(host: string): string {
  // The credentials often come from JSON.parse(), so the type doesn't guarantee a host
  if (typeof host !== 'string' || !host.trim()) {
    throw new HomeWizardError(
      'invalid',
      'The "host" of the credentials is missing: pass the address of the device, as pair() returns it',
    );
  }

  const trimmed = host.trim().replace(/\/+$/, '');

  if (/^http:\/\//i.test(trimmed)) {
    throw new HomeWizardError(
      'invalid',
      `The API v2 only works over HTTPS, use "${trimmed.replace(/^http:/i, 'https:')}" or just the IP address`,
    );
  }

  return /^https:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Sends the requests to one device: HTTPS with the HomeWizard certificate checks, the token, the API version
 * header and the API v2 errors. The device classes use it.
 *
 * @internal
 */
export class Client {
  readonly baseUrl: string;
  readonly dispatcher: Dispatcher;
  readonly loggerOptions: LoggerOptions | undefined;
  protected token: string | undefined;
  protected readonly timeout: number;
  protected readonly retries: number;
  /** Aborted by `close()`, so a read that waits to retry stops instead. */
  protected readonly closing = new AbortController();
  protected readonly ownsDispatcher: boolean;
  protected warnedAboutApiVersion = false;

  /**
   * A given `dispatcher` replaces the agent, and with it the certificate checks of the policy.
   */
  constructor(host: string, options: ClientOptions) {
    this.baseUrl = toBaseUrl(host);
    this.token = options.token;
    this.loggerOptions = options.logger;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retries = options.retries ?? DEFAULT_RETRIES;
    this.ownsDispatcher = !options.dispatcher;
    this.dispatcher =
      options.dispatcher ?? new Agent({ connect: options.policy.tlsOptions(options.ca) });
  }

  /** Sends the token with the next requests, for example the one pairing just created. */
  useToken(token: string): void {
    this.token = token;
  }

  /** What the WebSocket needs to connect to this device: the same TLS agent, token and logger. */
  webSocketTarget(): SocketTarget {
    return {
      url: `${this.baseUrl.replace(/^https:/i, 'wss:')}/api/ws`,
      token: this.token,
      dispatcher: this.dispatcher,
      logger: this.loggerOptions,
    };
  }

  log(...args: unknown[]): void {
    log(this.loggerOptions, ...args);
  }

  /**
   * Sends a request and returns what `read` makes of the response, which checks its status with `readResponse()`.
   * Throws a `HomeWizardError`: a `response` error for an error status or a body that isn't valid JSON, and a
   * `timeout`, `network` or `certificate` error when there is no response. A `GET` that times out or fails on the network is retried, see `retries`.
   */
  async send<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions,
    read: (url: string, response: Dispatcher.ResponseData<unknown>) => Promise<T>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const backoff = new Backoff(RETRY_DELAY);

    for (let attempt = 0; ; attempt++) {
      try {
        return await read(url, await this.request(method, url, options));
      } catch (error) {
        const wrapped = toHomeWizardError(error, { type: 'request', method, url });
        const canRetry =
          method === 'GET' &&
          attempt < this.retries &&
          isTransientError(wrapped) &&
          !this.closing.signal.aborted;

        if (!canRetry) throw wrapped;

        const delay = backoff.next();
        this.log(`${method} ${url} failed (${wrapped.kind}), retrying in ${delay}ms`);
        await wait(delay, this.closing.signal);

        if (this.closing.signal.aborted) throw wrapped;
      }
    }
  }

  /** Sends a request. `readResponse()` checks the status of the response. */
  protected async request(
    method: HttpMethod,
    url: string,
    options: RequestOptions,
  ): Promise<Dispatcher.ResponseData<unknown>> {
    const hasBody = options.body !== undefined;

    const headers: Record<string, string> = {
      'X-Api-Version': API_MAJOR_VERSION,
      Accept: options.accept ?? 'application/json',
    };

    if (hasBody) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    this.log(`${method} ${url}${hasBody ? ` ${redact(options.body)}` : ''}`);

    const response = await requestWithTimeout(
      url,
      {
        method,
        headers,
        body: hasBody ? JSON.stringify(options.body) : undefined,
        dispatcher: this.dispatcher,
        bodyTimeout: this.timeout || undefined,
      },
      this.timeout,
      requestErrors,
    );

    this.checkApiVersion(response.headers['x-api-version']);

    return response;
  }

  /**
   * Logs once when the device answers with a newer API version than the types follow. The device keeps the
   * API backward compatible within a major version, so this is a hint, not an error.
   *
   * @link https://api-documentation.homewizard.com/docs/versioning
   */
  protected checkApiVersion(version: unknown): void {
    if (this.warnedAboutApiVersion || typeof version !== 'string') return;
    if (!isNewerApiVersion(version, DOCUMENTED_API_VERSION)) return;

    this.warnedAboutApiVersion = true;
    this.log(
      `The device answers with API ${version}, newer than the ${DOCUMENTED_API_VERSION} this library follows. It keeps working, but fields added since aren't in the types yet.`,
    );
  }

  /** Sends a request and returns the JSON body. */
  async json<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    return this.send(method, path, { body }, async (url, response) => {
      const data = await readResponse<T>(response, { method, url }, requestErrors);

      this.log(`Received ${redact(data)} from ${url}`);

      return data;
    });
  }

  /** Sends a request that answers `204 No Content`. */
  async empty(method: HttpMethod, path: string, body?: unknown): Promise<void> {
    await this.send(method, path, { body }, (url, response) =>
      readResponse(response, { method, url }, requestErrors, 'text'),
    );
  }

  /** Sends a request and returns the plain-text body. */
  async text(method: HttpMethod, path: string): Promise<string> {
    return this.send(method, path, { accept: 'text/plain' }, async (url, response) => {
      const text = await readResponse(response, { method, url }, requestErrors, 'text');

      this.log(`Received ${JSON.stringify(text)} from ${url}`);

      return text;
    });
  }

  /** Stops the retries, and closes the connections when this client created the dispatcher. */
  async close(): Promise<void> {
    this.closing.abort();

    if (this.ownsDispatcher) {
      await this.dispatcher.close();
    }
  }
}
