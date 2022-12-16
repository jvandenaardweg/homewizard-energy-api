import * as multicastDns from 'multicast-dns';
import { MdnsTxtRecord, MDNS_DISCOVERY_DOMAIN, MDNS_DISCOVERY_TYPE } from './types';

interface DiscoveryResponse {
  ip: string;
  hostname: string;
  txt: MdnsTxtRecord;
}

interface MdnsAnswer<T> {
  name: string;
  type: string;
  ttl: number;
  class: string;
  flush: boolean;
  data: T;
}

interface HomeWizardEnergyApiOptions {
  logger?: (...args: unknown[]) => void;
}

/**
 * HomeWizard Energy API
 *
 * @link: https://homewizard-energy-api.readthedocs.io
 */
export class HomeWizardEnergyApi {
  private mdns: multicastDns.MulticastDNS | null = null;
  private logger: HomeWizardEnergyApiOptions['logger'];

  constructor(options?: HomeWizardEnergyApiOptions) {
    this.logger = options?.logger;
  }

  log(...args: unknown[]): void {
    if (!this.logger) return;

    return this.logger('[HomeWizard Energy API]: ', ...args);
  }

  get discovery() {
    return {
      start: this.discoveryStart.bind(this),
      stop: this.discoveryStop.bind(this),
      on: this.discoveryOn.bind(this),
    };
  }

  protected discoveryStart() {
    this.log('discoveryStart');

    this.mdns = multicastDns.default();

    this.mdns.query(MDNS_DISCOVERY_DOMAIN, 'PTR');
  }

  protected discoveryStop() {
    this.log('discoveryStop');

    if (this.mdns) {
      this.mdns.removeAllListeners();
      this.mdns.destroy();
      this.mdns = null;
    }
  }

  protected discoveryOn(
    event: 'response',
    callback: (discoveryResponse: DiscoveryResponse) => void,
  ): void;
  protected discoveryOn(event: 'error', callback: (error: Error) => void): void;
  protected discoveryOn(event: 'warning', callback: (error: Error) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected discoveryOn(event: 'response' | 'error' | 'warning', callback: (d: any) => void): void {
    if (event === 'error') {
      this.mdns?.on(event, this.handleMdnsError(callback));
      return;
    }

    if (event === 'warning') {
      this.mdns?.on(event, this.handleMdnsWarning(callback));
      return;
    }

    this.mdns?.on(event, this.handleMdnsResponse(callback));
    return;
  }

  protected handleMdnsResponse(callback: (discoveryResponse: DiscoveryResponse) => void) {
    return (response: multicastDns.ResponsePacket) => {
      // Filter out responses we don't need
      const hwenergyResponse = response.answers.filter(answer =>
        answer.name.includes(MDNS_DISCOVERY_TYPE),
      );

      this.log('Received response from mDNS:', response);

      if (!hwenergyResponse.length) return;

      this.log('Got a response from hwenergy:', hwenergyResponse);

      // Response is from hwenergy

      const additional = response.additionals.find(additional => additional.type === 'A') as
        | MdnsAnswer<string>
        | undefined;

      const txt = response.answers.find(answer => answer.type === 'TXT') as
        | MdnsAnswer<Buffer[]>
        | undefined;

      // This should not happen, but just in case
      if (!additional) {
        throw new Error('No additional data found in mDNS response');
      }

      // This should not happen, but just in case
      if (!txt) {
        throw new Error('No txt data found in mDNS response');
      }

      // Now we got all the relevant info we need

      const ip = additional.data;
      const hostname = additional.name;

      // Simple buffer to string
      // TODO: will this work on any node version?
      const textRecord = txt.data.reduce((prev, buffer) => {
        const [key, value] = buffer.toString().split('=');

        prev[key] = value;

        return prev;
      }, {} as Record<string, string>) as unknown as MdnsTxtRecord;

      const discoveryResponse = {
        ip,
        hostname,
        txt: textRecord,
      } satisfies DiscoveryResponse;

      this.log('Using callback response:', discoveryResponse);

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
