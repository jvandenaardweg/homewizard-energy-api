import * as multicastDns from 'multicast-dns';
import util from 'util';
import { bufferArrayToJSON, isBufferArray } from '@/shared/buffer';
import { log, LoggerOptions } from './logger';

export const MDNS_QUERY_TYPE = 'PTR';

export interface MdnsDiscoveryResponse<TTxtRecord> {
  ip: string;
  hostname: string;
  fqdn: string;
  txt: TTxtRecord;
}

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

  protected isGoodbyeResponse(response: multicastDns.ResponsePacket): boolean {
    return response.answers.some(answer => {
      if ('ttl' in answer) {
        return (
          answer.type === MDNS_QUERY_TYPE &&
          answer.ttl === 0 &&
          answer.data.includes(this.serviceType)
        );
      }

      return false;
    });
  }

  /**
   * Find out if the response is about the service type of this discovery.
   */
  protected isServiceResponse(response: multicastDns.ResponsePacket): boolean {
    return (
      response.answers?.filter(answer => {
        if ('data' in answer && typeof answer.data === 'string') {
          return answer.data.includes(this.serviceType);
        }

        return false;
      }).length > 0
    );
  }

  protected getTxtRecordFromResponse(
    response: multicastDns.ResponsePacket,
    fqdn?: string,
  ): TTxtRecord | null {
    const txt = this.findTxtRecord(response, fqdn);

    // no txt record found
    if (!txt) return null;

    // no data property found
    if (!('data' in txt)) return null;

    // data is not an array of buffers
    if (!isBufferArray(txt.data)) return null;

    // txt.data must be an Array of Buffers when we end up here

    return bufferArrayToJSON<TTxtRecord>(txt.data);
  }

  /**
   * Finds the TXT record of the service in the answer or additional section.
   *
   * A device can announce both its services in one packet, `_hwenergy._tcp` (API v1) and `_homewizard._tcp`
   * (API v2), each with its own TXT record. So the TXT record of the fqdn wins, then one of this service type. A
   * TXT record of another service is never used, as it would mix the two services' data. A TXT record that names no
   * service is still used, as before.
   */
  protected findTxtRecord(
    response: multicastDns.ResponsePacket,
    fqdn?: string,
  ): multicastDns.ResponsePacket['answers'][number] | undefined {
    const records = [...(response.answers ?? []), ...(response.additionals ?? [])].filter(
      record => record.type === 'TXT',
    );
    // mDNS names compare without case, and with or without the trailing dot of the root
    const normalize = (name: unknown) =>
      typeof name === 'string' ? name.toLowerCase().replace(/\.$/, '') : '';
    const service = `.${normalize(this.serviceDomain)}`;

    if (fqdn) {
      const own = records.find(record => normalize(record.name) === normalize(fqdn));
      if (own) return own;
    }

    const ofService = records.find(record => normalize(record.name).endsWith(service));
    if (ofService) return ofService;

    return records.find(record => !/\._(tcp|udp)\.local$/.test(normalize(record.name)));
  }

  protected getHostDetailsFromAnswer(
    answer: multicastDns.ResponsePacket['answers'][number],
  ): { ip: string; hostname: string } | null {
    if (!('data' in answer)) return null;
    if (typeof answer.data !== 'string') return null;

    return { ip: answer.data, hostname: answer.name };
  }

  protected getHostDetailsFromResponse(
    response: multicastDns.ResponsePacket,
  ): { ip: string; hostname: string } | null {
    // We can find the host details in the answer or additional section
    const answer = response.answers.find(answer => answer.type === 'A');
    const additional = response.additionals.find(additional => additional.type === 'A');

    // Prefer the additional section when both have an A record
    const hostRecord = additional || answer;

    if (!hostRecord) return null;

    return this.getHostDetailsFromAnswer(hostRecord);
  }

  protected getFqdnFromResponse(response: multicastDns.ResponsePacket): string | null {
    const ptr = response.answers.find(a => a.type === 'PTR' && a.name?.includes(this.serviceType));

    if (!ptr) {
      return null;
    }

    if (ptr && !('data' in ptr)) {
      return null;
    }

    if (typeof ptr.data !== 'string') {
      return null;
    }

    return ptr.data;
  }

  protected getCachedResponseByFqdn(fqdn: string): MdnsDiscoveryResponse<TTxtRecord> | undefined {
    return this.cachedDiscoveryResponses.find(cachedResponse => cachedResponse.fqdn === fqdn);
  }

  protected removeCachedResponseByFqdn(fqdn: string): void {
    this.cachedDiscoveryResponses = this.cachedDiscoveryResponses.filter(
      cachedResponse => cachedResponse.fqdn !== fqdn,
    );
  }

  protected isDiscoveryResponseInCache(
    discoveryResponse: MdnsDiscoveryResponse<TTxtRecord>,
  ): boolean {
    return this.cachedDiscoveryResponses.some(cachedDiscoveryResponse =>
      util.isDeepStrictEqual(discoveryResponse, cachedDiscoveryResponse),
    );
  }

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

      // Store response in cache, so we don't send multiple events for the same device when not needed
      this.cachedDiscoveryResponses.push(discoveryResponse);

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
