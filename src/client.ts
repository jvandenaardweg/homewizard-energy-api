import { Agent, Dispatcher } from 'undici';
import { log, LoggerOptions } from '@/shared/logger';
import {
  DEFAULT_TIMEOUT,
  isResponseOk,
  parseJsonResponse,
  requestWithTimeout,
} from '@/shared/request';
import {
  createInvalidJsonError,
  createResponseError,
  createTimeoutError,
  HomeWizardError,
  toHomeWizardError,
} from './errors';
import { createCheckServerIdentity, HOMEWIZARD_CA_CERT } from './tls';
import { API_MAJOR_VERSION, DOCUMENTED_API_VERSION } from './types';
import type { DeviceSocketConnection } from './websocket';

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
   * The token from `pair()`. Without it, every request fails with `user:unauthorized`.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/authorization
   */
  token?: string;
  /**
   * The identifier the device's certificate is issued to, formatted as `appliance/<product type>/<serial>`.
   * Store the one `pair()` returns. `getCertificateIdentifier()` builds it from the product type and the serial on
   * the device's label. Don't take it from discovery: anyone on the network can announce a device.
   *
   * Required, unless `insecure` is `true`. Requests fail when the certificate isn't issued to this identifier.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/authorization#https
   */
  identifier?: string;
}

/** How a device connects. All optional. */
export interface DeviceOptions {
  /**
   * Skip all certificate checks, so any device at this address is accepted. Only use this for debugging.
   */
  insecure?: boolean;
  /**
   * The maximum time in milliseconds a request may take until the response headers arrive, including
   * connecting. Defaults to `5000`. Set to `0` to disable it.
   */
  timeout?: number;
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
export interface ClientOptions extends DeviceOptions, Omit<Credentials, 'host'> {
  /** Allows a missing `identifier` without `insecure`, so pairing can learn it. */
  allowMissingIdentifier?: boolean;
  /** Receives the Common Name of each certificate that passes the check. */
  onCertificate?: (commonName: string) => void;
}

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE';

/**
 * Returns `true` when `version` (such as `2.4.0`) is newer than `than`. A version it can't read counts as not newer.
 */
export function isNewerApiVersion(version: string, than: string): boolean {
  const parse = (value: string) => value.trim().split('.').map(Number);
  const a = parse(version);
  const b = parse(than);

  if (a.some(Number.isNaN)) return false;

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference > 0;
  }

  return false;
}

/** Formats a value for a log line, with every `token` field replaced, so a token never ends up in a log. */
export function redact(value: unknown): string {
  return JSON.stringify(value, (key, field) => (key === 'token' ? '[redacted]' : field));
}

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
  readonly options: ClientOptions;
  token: string | undefined;
  protected readonly timeout: number;
  protected readonly ownsDispatcher: boolean;
  protected warnedAboutApiVersion = false;

  constructor(host: string, options: ClientOptions = {}) {
    if (!options.identifier && !options.insecure && !options.allowMissingIdentifier) {
      throw new HomeWizardError(
        'invalid',
        'The "identifier" of the credentials is required to check the certificate of the device. Use the identifier that pair() returned, or getCertificateIdentifier() with the serial on the device label. Set "insecure: true" to skip the check.',
      );
    }

    this.baseUrl = toBaseUrl(host);
    this.options = options;
    this.token = options.token;
    this.loggerOptions = options.logger;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.ownsDispatcher = !options.dispatcher;
    this.dispatcher = options.dispatcher ?? new Agent({ connect: this.tlsOptions });
  }

  /** The TLS options for the HTTPS requests and the WebSocket. */
  get tlsOptions() {
    const { insecure, ca, identifier, onCertificate } = this.options;

    if (insecure) {
      return { rejectUnauthorized: false, checkServerIdentity: () => undefined };
    }

    return {
      ca: ca ?? HOMEWIZARD_CA_CERT,
      rejectUnauthorized: true,
      checkServerIdentity: createCheckServerIdentity(identifier, onCertificate),
    };
  }

  /** What the WebSocket needs to connect to this device: the same TLS agent, token and logger. */
  webSocketConnection(): DeviceSocketConnection {
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
   * Sends a request and returns what `read` makes of the response. Throws a `HomeWizardError`: a `response`
   * error for an error status or a body that isn't valid JSON, and a `timeout`, `network` or `certificate` error
   * when there is no response.
   */
  async send<T>(
    method: HttpMethod,
    path: string,
    options: { body?: unknown; accept?: string },
    read: (url: string, response: Dispatcher.ResponseData<unknown>) => Promise<T>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    try {
      return await read(url, await this.request(method, url, options));
    } catch (error) {
      throw toHomeWizardError(error, method, url);
    }
  }

  /** Sends a request, and throws for an error status. */
  protected async request(
    method: HttpMethod,
    url: string,
    options: { body?: unknown; accept?: string },
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
      createTimeoutError,
    );

    this.checkApiVersion(response.headers['x-api-version']);

    if (!isResponseOk(response)) {
      const text = await response.body.text();

      throw createResponseError(method, url, response.statusCode, text);
    }

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
      const data = await parseJsonResponse<T>(url, method, response, createInvalidJsonError);

      this.log(`Received ${redact(data)} from ${url}`);

      return data;
    });
  }

  /** Sends a request that answers `204 No Content`. */
  async empty(method: HttpMethod, path: string, body?: unknown): Promise<void> {
    await this.send(method, path, { body }, async (_url, response) => {
      // Consume the body, so the connection can be reused
      await response.body.text();
    });
  }

  /** Sends a request and returns the plain-text body. */
  async text(method: HttpMethod, path: string): Promise<string> {
    return this.send(method, path, { accept: 'text/plain' }, async (url, response) => {
      const text = await response.body.text();

      this.log(`Received ${JSON.stringify(text)} from ${url}`);

      return text;
    });
  }

  /** Closes the connections, when this client created the dispatcher. */
  async close(): Promise<void> {
    if (this.ownsDispatcher) {
      await this.dispatcher.close();
    }
  }
}
