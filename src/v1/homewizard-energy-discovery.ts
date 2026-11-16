import * as multicastDns from 'multicast-dns';
import { MdnsTxtRecord, MDNS_DISCOVERY_TYPE } from '@/v1/types';
import { LoggerOptions } from '@/shared/logger';
import { MdnsDiscovery } from '@/shared/mdns-discovery';

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
 * HomeWizard Energy Discovery, for the devices with the API v1 (`_hwenergy._tcp`).
 *
 * @link https://api-documentation.homewizard.com/docs/discovery
 */
export class HomeWizardEnergyDiscovery extends MdnsDiscovery<MdnsTxtRecord> {
  constructor(options?: HomeWizardEnergyDiscoveryOptions) {
    super(MDNS_DISCOVERY_TYPE, options?.logger);
  }

  protected isServiceResponse(response: multicastDns.ResponsePacket): boolean {
    return this.isHomeWizardEnergyResponse(response);
  }

  /**
   * Find out if the response is a HomeWizard Energy response.
   */
  protected isHomeWizardEnergyResponse(response: multicastDns.ResponsePacket): boolean {
    return super.isServiceResponse(response);
  }
}
