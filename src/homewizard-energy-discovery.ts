import * as multicastDns from 'multicast-dns';
import {
  MdnsTxtRecord,
  MDNS_DISCOVERY_DOMAIN,
  MDNS_DISCOVERY_TYPE,
  MDNS_DISCOVERY_QUERY_TYPE,
} from '@/types';
import { bufferArrayToJSON, isBufferArray } from '@/utils/buffer';
import util from 'util';
import { LoggerOptions } from './base-api';

export interface DiscoveryResponse {
  ip: string;
  hostname: string;
  fqdn: string;
  txt: MdnsTxtRecord;
}

export interface HomeWizardEnergyDiscoveryOptions {
  logger?: LoggerOptions;
}

/**
 * HomeWizard Energy Discovery
 *
 * @link: https://homewizard-energy-api.readthedocs.io/discovery.html
 */
export class HomeWizardEnergyDiscovery {
  private mdns: multicastDns.MulticastDNS | null = null;
  private loggerOptions: HomeWizardEnergyDiscoveryOptions['logger'];
  private cachedDiscoveryResponses: DiscoveryResponse[] = [];

  constructor(options?: HomeWizardEnergyDiscoveryOptions) {
    this.loggerOptions = options?.logger;
  }

  protected log(...args: unknown[]): void {
    if (!this.loggerOptions?.method) return;

    const loggerPrefix = this.loggerOptions.prefix || '[HomeWizard Energy API]:';

    return this.loggerOptions.method(loggerPrefix, ...args);
  }

  start() {
    this.log('start');

    this.mdns = multicastDns.default();

    this.mdns.query(MDNS_DISCOVERY_DOMAIN, MDNS_DISCOVERY_QUERY_TYPE);
  }

  stop() {
    this.log('stop');

    if (this.mdns) {
      this.mdns.removeAllListeners();
      this.mdns.destroy();
      this.mdns = null;
    }
  }

  on(event: 'response', callback: (discoveryResponse: DiscoveryResponse) => void): void;
  // on(event: 'down', callback: (downResponse: DiscoveryResponse) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'warning', callback: (error: Error) => void): void;
  on(
    event: 'response' | 'error' | 'warning' | 'down',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (d: any) => void,
  ): void {
    if (!this.mdns) {
      throw new Error('mDNS is not started, call discovery.start() first');
    }

    // if (event === 'down') {
    //   this.on(event, this.handleMdnsDown(callback));
    //   return;
    // }

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

  // TODO: make this handler work
  // protected handleMdnsDown(callback: (goodbyeResponse: DiscoveryResponse) => void) {
  //   return (response: multicastDns.ResponsePacket) => {
  //     console.log('goodbye!', response);

  //     // TODO: fix
  //     callback(response as unknown as DiscoveryResponse);
  //   };
  // }

  protected isGoodbyeResponse(response: multicastDns.ResponsePacket): boolean {
    return response.answers.some(answer => {
      if ('ttl' in answer) {
        return (
          answer.type === MDNS_DISCOVERY_QUERY_TYPE &&
          answer.ttl === 0 &&
          answer.data.includes(MDNS_DISCOVERY_TYPE)
        );
      }

      return false;
    });
  }

  /**
   * Find out if the response is a HomeWizard Energy response.
   */
  protected isHomeWizardEnergyResponse(response: multicastDns.ResponsePacket): boolean {
    return (
      response.answers?.filter(answer => {
        if ('data' in answer && typeof answer.data === 'string') {
          return answer.data.includes(MDNS_DISCOVERY_TYPE);
        }

        return false;
      }).length > 0
    );
  }

  protected getTxtRecordFromResponse(response: multicastDns.ResponsePacket): MdnsTxtRecord | null {
    const txt = response.answers.find(answer => answer.type === 'TXT');

    // no txt record found
    if (!txt) return null;

    // no data property found
    if (!('data' in txt)) return null;

    // data is not an array of buffers
    if (!isBufferArray(txt.data)) return null;

    // txt.data must be an Array of Buffers when we end up here

    const txtRecordFromBuffers = bufferArrayToJSON<MdnsTxtRecord>(txt.data);

    return txtRecordFromBuffers;
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

    if (!answer && !additional) return null;

    if (answer && !additional) {
      return this.getHostDetailsFromAnswer(answer);
    }

    if (additional) {
      return this.getHostDetailsFromAnswer(additional);
    }

    return null;
  }

  protected getFqdnFromResponse(response: multicastDns.ResponsePacket): string | null {
    const ptr = response.answers.find(
      a => a.type === 'PTR' && a.name?.includes(MDNS_DISCOVERY_TYPE),
    );

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

  protected getCachedResponseByFqdn(fqdn: string): DiscoveryResponse | undefined {
    return this.cachedDiscoveryResponses.find(cachedResponse => cachedResponse.fqdn === fqdn);
  }

  protected removeCachedResponseByFqdn(fqdn: string): void {
    this.cachedDiscoveryResponses = this.cachedDiscoveryResponses.filter(
      cachedResponse => cachedResponse.fqdn !== fqdn,
    );
  }

  protected isDiscoveryResponseInCache(discoveryResponse: DiscoveryResponse): boolean {
    return this.cachedDiscoveryResponses.some(cachedDiscoveryResponse =>
      util.isDeepStrictEqual(discoveryResponse, cachedDiscoveryResponse),
    );
  }

  protected handleMdnsResponse(callback: (discoveryResponse: DiscoveryResponse) => void) {
    return (response: multicastDns.ResponsePacket) => {
      const isHomeWizardEnergyResponse = this.isHomeWizardEnergyResponse(response);

      this.log(`Received response from mDNS: ${JSON.stringify(response)}`);

      if (!isHomeWizardEnergyResponse) {
        this.log('Response from mDNS is not from HomeWizard Energy, ignoring.');
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
        }

        this.log('down!', cachedResponse);

        // this.emit('down', cachedResponse);

        // Remove the response from cache by using the fqdn, which is specific enough
        this.removeCachedResponseByFqdn(fqdn);

        return;
      }

      // Response is from hwenergy

      const hostDetails = this.getHostDetailsFromResponse(response);

      const txtRecord = this.getTxtRecordFromResponse(response);

      // This should not happen, but just in case
      if (!hostDetails) {
        throw new Error(`No host details found in mDNS response: ${JSON.stringify(response)}`);
      }

      // This should not happen, but just in case
      if (!txtRecord) {
        throw new Error(`No txt record data found in mDNS response: ${JSON.stringify(response)}`);
      }

      const discoveryResponse = {
        ip: hostDetails.ip,
        hostname: hostDetails.hostname,
        fqdn,
        txt: txtRecord,
      } satisfies DiscoveryResponse;

      const isDiscoveryResponseInCache = this.isDiscoveryResponseInCache(discoveryResponse);

      if (isDiscoveryResponseInCache) {
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
