import { Agent, Dispatcher } from 'undici';
import { HomeWizardEnergyApiError } from '@/shared/errors';
import { log, LoggerOptions } from '@/shared/logger';
import {
  describeCall,
  isResponseOk,
  parseJsonResponse,
  requestWithTimeout,
} from '@/shared/request';
import { HomeWizardApiV2Error } from './errors';
import { createCheckServerIdentity, HOMEWIZARD_CA_CERT } from './tls';
import { API_VERSION_HEADER } from './types';

/** 5 seconds: the TLS handshake on the device takes longer than a plain HTTP request. */
export const DEFAULT_TIMEOUT = 5000;

export interface DeviceOptions {
  /**
   * The token from `pair()`. Without it, every request fails with `user:unauthorized`.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/authorization
   */
  token?: string;
  /**
   * The identifier the device's certificate is issued to, formatted as `appliance/<product type>/<serial>`.
   * `pair()` returns it, discovery has it as the `id` txt record, and `getCertificateIdentifier()` builds it.
   *
   * Required, unless `insecure` is `true`. Requests fail when the certificate isn't issued to this identifier.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/authorization#https
   */
  identifier?: string;
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
export interface ClientOptions extends DeviceOptions {
  /** Allows a missing `identifier` without `insecure`, so pairing can learn it. */
  allowMissingIdentifier?: boolean;
  /** Receives the Common Name of each certificate that passes the check. */
  onCertificate?: (commonName: string) => void;
}

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE';

/**
 * Normalises a host to its HTTPS origin: `192.168.1.35`, `https://192.168.1.35` and `https://192.168.1.35/`
 * all become `https://192.168.1.35`.
 */
export function toBaseUrl(host: string): string {
  const trimmed = host.trim().replace(/\/+$/, '');

  if (/^http:\/\//i.test(trimmed)) {
    throw new HomeWizardEnergyApiError(
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
  readonly identifier: string | undefined;
  readonly dispatcher: Dispatcher;
  readonly loggerOptions: LoggerOptions | undefined;
  readonly options: ClientOptions;
  token: string | undefined;
  protected readonly timeout: number;
  protected readonly ownsDispatcher: boolean;

  constructor(host: string, options: ClientOptions = {}) {
    if (!options.identifier && !options.insecure && !options.allowMissingIdentifier) {
      throw new HomeWizardEnergyApiError(
        'The "identifier" option is required to check the certificate of the device. Use the identifier that pair() returned, the "id" txt record from discovery, or getCertificateIdentifier(). Set "insecure: true" to skip the check.',
      );
    }

    this.baseUrl = toBaseUrl(host);
    this.options = options;
    this.token = options.token;
    this.identifier = options.identifier;
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

  log(...args: unknown[]): void {
    log(this.loggerOptions, ...args);
  }

  /**
   * Sends a request and returns the raw response. Throws a `HomeWizardApiV2Error` for an error status.
   */
  async send(
    method: HttpMethod,
    path: string,
    options: { body?: unknown; accept?: string },
  ): Promise<{ url: string; response: Dispatcher.ResponseData<unknown> }> {
    const url = `${this.baseUrl}${path}`;
    const hasBody = options.body !== undefined;

    const headers: Record<string, string> = {
      'X-Api-Version': API_VERSION_HEADER,
      Accept: options.accept ?? 'application/json',
    };

    if (hasBody) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    this.log(`${method} ${url}${hasBody ? ` ${JSON.stringify(options.body)}` : ''}`);

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
    );

    if (!isResponseOk(response)) {
      const text = await response.body.text();

      throw new HomeWizardApiV2Error(
        `${describeCall(method, url)} failed with status ${response.statusCode} and response data: ${text}`,
        url,
        response.statusCode,
        text,
      );
    }

    return { url, response };
  }

  /** Sends a request and returns the JSON body. */
  async json<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const { url, response } = await this.send(method, path, { body });
    const data = await parseJsonResponse<T>(url, method, response);

    this.log(`Received ${JSON.stringify(data)} from ${url}`);

    return data;
  }

  /** Sends a request that answers `204 No Content`. */
  async empty(method: HttpMethod, path: string, body?: unknown): Promise<void> {
    const { response } = await this.send(method, path, { body });

    // Consume the body, so the connection can be reused
    await response.body.text();
  }

  /** Sends a request and returns the plain-text body. */
  async text(method: HttpMethod, path: string): Promise<string> {
    const { url, response } = await this.send(method, path, { accept: 'text/plain' });
    const text = await response.body.text();

    this.log(`Received ${JSON.stringify(text)} from ${url}`);

    return text;
  }

  /** Closes the connections, when this client created the dispatcher. */
  async close(): Promise<void> {
    if (this.ownsDispatcher) {
      await this.dispatcher.close();
    }
  }
}
