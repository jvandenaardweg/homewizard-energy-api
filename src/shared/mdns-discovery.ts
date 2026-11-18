import * as multicastDns from 'multicast-dns';
import util from 'util';
import { log, LoggerOptions } from './logger';
import {
  findFqdn,
  findHost,
  findServicePtr,
  findTxtRecord,
  hostDetailsOf,
  isGoodbye,
  isSameName,
  MdnsDiscoveryResponse,
  parseTxtRecord,
} from './mdns-discovery-packet';

export type { MdnsDiscoveryResponse } from './mdns-discovery-packet';

export const MDNS_QUERY_TYPE = 'PTR';

/**
 * Discovers the devices that announce one mDNS service type, such as `hwenergy` or `homewizard`.
 *
 * @link https://api-documentation.homewizard.com/docs/discovery
 */
export class MdnsDiscovery<TTxtRecord extends object> {
  protected mdns: multicastDns.MulticastDNS | null = null;
  protected loggerOptions: LoggerOptions | undefined;
  protected cachedDiscoveryResponses: MdnsDiscoveryResponse<TTxtRecord>[] = [];

  /**
   * @param serviceType The service type without underscores or domain, for example `hwenergy`.
   */
  constructor(
    protected readonly serviceType: string,
    logger?: LoggerOptions,
  ) {
    this.loggerOptions = logger;
  }

  /** The domain to query, for example `_hwenergy._tcp.local`. */
  protected get serviceDomain(): string {
    return `_${this.serviceType}._tcp.local`;
  }

  protected log(...args: unknown[]): void {
    return log(this.loggerOptions, ...args);
  }

  /**
   * Starts discovery by sending an mDNS query. Calling it again while started sends a new query
   * on the same mDNS instance.
   */
  start() {
    this.log('start');

    // Reuse the running instance, so a second start() doesn't leave the first socket open
    if (!this.mdns) {
      this.mdns = multicastDns.default();
    }

    this.mdns.query(this.serviceDomain, MDNS_QUERY_TYPE);
  }

  stop() {
    this.log('stop');

    if (this.mdns) {
      this.mdns.removeAllListeners();
      this.mdns.destroy();
      this.mdns = null;
    }
  }

  on(
    event: 'response',
    callback: (discoveryResponse: MdnsDiscoveryResponse<TTxtRecord>) => void,
  ): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'warning', callback: (error: Error) => void): void;
  on(
    event: 'response' | 'error' | 'warning',
    // oxlint-disable-next-line typescript/no-explicit-any
    callback: (d: any) => void,
  ): void {
    if (!this.mdns) {
      throw new Error('mDNS is not started, call discovery.start() first');
    }

    if (event === 'error') {
      this.mdns.on(event, this.handleMdnsError(callback));
      return;
    }

    if (event === 'warning') {
      this.mdns.on(event, this.handleMdnsWarning(callback));
      return;
    }

    this.mdns.on(event, this.handleMdnsResponse(callback));
  }

  /**
   * Whether the packet says goodbye for the device: for the fqdn of `getFqdnFromResponse()`, or the instance the
   * PTR of this service points at, which is the same unless a subclass changes it.
   */
  protected isGoodbyeResponse(response: multicastDns.ResponsePacket): boolean {
    return [this.getFqdnFromResponse(response), findFqdn(response, this.serviceDomain)].some(
      fqdn => fqdn !== null && isGoodbye(response, this.serviceDomain, fqdn),
    );
  }

  /**
   * Find out if the response is about the service type of this discovery: it has a PTR answer named for it.
   */
  protected isServiceResponse(response: multicastDns.ResponsePacket): boolean {
    return findServicePtr(response, this.serviceDomain) !== undefined;
  }

  protected getTxtRecordFromResponse(
    response: multicastDns.ResponsePacket,
    fqdn?: string,
  ): TTxtRecord | null {
    return parseTxtRecord<TTxtRecord>(this.findTxtRecord(response, fqdn));
  }

  /**
   * Finds the TXT record of the device in the answer or additional section: the one of the fqdn, else the one of
   * the instance the PTR of this service points at, which is the fqdn unless a subclass changes it. A device can
   * announce both its services in one packet, `_hwenergy._tcp` (API v1) and `_homewizard._tcp` (API v2), each with
   * its own TXT record, so a TXT record of another service or device is never used. A TXT record that names no
   * service is still used, as before.
   */
  protected findTxtRecord(
    response: multicastDns.ResponsePacket,
    fqdn?: string,
  ): multicastDns.ResponsePacket['answers'][number] | undefined {
    return findTxtRecord(response, [fqdn, findFqdn(response, this.serviceDomain)]);
  }

  protected getHostDetailsFromAnswer(
    answer: multicastDns.ResponsePacket['answers'][number],
  ): { ip: string; hostname: string } | null {
    return hostDetailsOf(answer);
  }

  /**
   * Finds the host of the device with `getHostDetailsFromAnswer()`, from the A record of the SRV target of the fqdn
   * of `getFqdnFromResponse()`, or without that SRV, the first A record. The additional section wins over the
   * answers.
   */
  protected getHostDetailsFromResponse(
    response: multicastDns.ResponsePacket,
  ): { ip: string; hostname: string } | null {
    const record = findHost(response, this.getFqdnFromResponse(response));

    return record ? this.getHostDetailsFromAnswer(record) : null;
  }

  protected getFqdnFromResponse(response: multicastDns.ResponsePacket): string | null {
    return findFqdn(response, this.serviceDomain);
  }

  protected getCachedResponseByFqdn(fqdn: string): MdnsDiscoveryResponse<TTxtRecord> | undefined {
    return this.cachedDiscoveryResponses.find(cachedResponse =>
      isSameName(cachedResponse.fqdn, fqdn),
    );
  }

  protected removeCachedResponseByFqdn(fqdn: string): void {
    this.cachedDiscoveryResponses = this.cachedDiscoveryResponses.filter(
      cachedResponse => !isSameName(cachedResponse.fqdn, fqdn),
    );
  }

  protected isDiscoveryResponseInCache(
    discoveryResponse: MdnsDiscoveryResponse<TTxtRecord>,
  ): boolean {
    return this.cachedDiscoveryResponses.some(cachedDiscoveryResponse =>
      util.isDeepStrictEqual(discoveryResponse, cachedDiscoveryResponse),
    );
  }

  /**
   * Returns the listener for mDNS responses. It reads each packet through the protected finders, in this order, so
   * a subclass can override any of them: `isServiceResponse()`, `getFqdnFromResponse()`, `isGoodbyeResponse()`,
   * then for a goodbye `getCachedResponseByFqdn()` and `removeCachedResponseByFqdn()`, and otherwise
   * `getHostDetailsFromResponse()`, `getTxtRecordFromResponse()` and `isDiscoveryResponseInCache()`. The default
   * `isGoodbyeResponse()` and `getHostDetailsFromResponse()` read the fqdn through `getFqdnFromResponse()` too.
   */
  protected handleMdnsResponse(
    callback: (discoveryResponse: MdnsDiscoveryResponse<TTxtRecord>) => void,
  ) {
    return (response: multicastDns.ResponsePacket) => {
      this.log(`Received response from mDNS: ${JSON.stringify(response)}`);

      if (!this.isServiceResponse(response)) {
        this.log(`Response from mDNS is not for ${this.serviceDomain}, ignoring.`);
        return;
      }

      // Get the FQDN from the response, we use this as a unique identifier for the device
      const fqdn = this.getFqdnFromResponse(response);

      if (!fqdn) {
        this.log(`No fqdn found in mDNS response, ignoring: ${JSON.stringify(response)}`);

        return;
      }

      if (this.isGoodbyeResponse(response)) {
        this.log(`Response is a goodbye message, we'll send a down event.`);

        const cachedResponse = this.getCachedResponseByFqdn(fqdn);

        if (!cachedResponse) {
          this.log(`No cached response found for ${fqdn}, ignoring.`);

          return;
        }

        this.log('down!', cachedResponse);

        // Remove the response from cache by using the fqdn, which is specific enough
        this.removeCachedResponseByFqdn(fqdn);

        return;
      }

      const hostDetails = this.getHostDetailsFromResponse(response);

      const txtRecord = this.getTxtRecordFromResponse(response, fqdn);

      // Don't throw here: this runs inside an mDNS event listener, so a throw would be uncaught
      // and any host on the network could crash the consuming process with one malformed packet.
      if (!hostDetails) {
        this.log(`No host details found in mDNS response, ignoring: ${JSON.stringify(response)}`);

        return;
      }

      if (!txtRecord) {
        this.log(
          `No txt record data found in mDNS response, ignoring: ${JSON.stringify(response)}`,
        );

        return;
      }

      const discoveryResponse: MdnsDiscoveryResponse<TTxtRecord> = {
        ip: hostDetails.ip,
        hostname: hostDetails.hostname,
        fqdn,
        txt: txtRecord,
      };

      if (this.isDiscoveryResponseInCache(discoveryResponse)) {
        this.log('Nothing changed. Response is already in cache, ignoring.');
        return;
      }

      // Store response in cache, so we don't send multiple events for the same device when not needed. It
      // replaces the device's old entry, so a device that moves back to an earlier IP address is sent again. Not
      // through removeCachedResponseByFqdn(), which a subclass may take as the device going away.
      this.cachedDiscoveryResponses = [
        ...this.cachedDiscoveryResponses.filter(cached => !isSameName(cached.fqdn, fqdn)),
        discoveryResponse,
      ];

      return callback(discoveryResponse);
    };
  }

  protected handleMdnsError(callback: (error: Error) => void) {
    return (error: Error) => {
      callback(error);
    };
  }

  protected handleMdnsWarning(callback: (error: Error) => void) {
    return (error: Error) => {
      callback(error);
    };
  }
}
