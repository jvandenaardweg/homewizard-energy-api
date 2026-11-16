import { HomeWizardEnergyApiError } from '@/shared/errors';
import { LoggerOptions } from '@/shared/logger';
import { MdnsDiscovery, MdnsDiscoveryResponse } from '@/shared/mdns-discovery';
import { DeviceOptions } from './client';
import { KwhMeter1Phase, KwhMeter3Phase } from './devices/kwh-meter';
import { P1Meter } from './devices/p1-meter';
import { PlugInBattery } from './devices/plug-in-battery';
import { MDNS_DISCOVERY_TYPE, MdnsTxtRecord } from './types';

/**
 * A device found on `_homewizard._tcp`. Pass it to `v2.fromDiscovery()` to get its device class.
 *
 * @link https://api-documentation.homewizard.com/docs/discovery#_homewizard_tcp
 */
export type DiscoveryResponse = MdnsDiscoveryResponse<MdnsTxtRecord>;

export interface DiscoveryOptions {
  logger?: LoggerOptions;
}

/**
 * Discovers the devices with the API v2, which announce `_homewizard._tcp`. Devices that also have the API v1
 * announce `_hwenergy._tcp` too, which the v1 `HomeWizardEnergyDiscovery` finds.
 *
 * @example
 * const discovery = new v2.Discovery();
 * discovery.start();
 * discovery.on('response', response => console.log(response.ip, response.txt.product_type));
 *
 * @link https://api-documentation.homewizard.com/docs/discovery
 */
export class Discovery extends MdnsDiscovery<MdnsTxtRecord> {
  constructor(options?: DiscoveryOptions) {
    super(MDNS_DISCOVERY_TYPE, options?.logger);
  }
}

export type DiscoveredDevice = P1Meter | KwhMeter1Phase | KwhMeter3Phase | PlugInBattery;

const DEVICE_CLASSES: Record<
  string,
  new (host: string, options: DeviceOptions) => DiscoveredDevice
> = {
  'HWE-P1': P1Meter,
  'HWE-KWH1': KwhMeter1Phase,
  'SDM230-wifi': KwhMeter1Phase,
  'HWE-KWH3': KwhMeter3Phase,
  'SDM630-wifi': KwhMeter3Phase,
  'HWE-BAT': PlugInBattery,
};

/**
 * Returns the device class for a discovered device, at its current IP address. Use it to find a device you
 * paired before: pass the token and identifier that `pair()` returned. Check the class with `instanceof`, for
 * example `device instanceof v2.P1Meter`.
 *
 * Anyone on the network can announce a device, so the discovered `id` is not trusted as the identifier: a
 * device announced with another `id` throws, so your token is never sent to another device. Throws too for a
 * product type without a v2 device class.
 *
 * To pair with a discovered device, pass its IP to `pair()`, which reads the identifier from the certificate.
 *
 * @example
 * discovery.on('response', response => {
 *   if (response.txt.id !== stored.identifier) return;
 *
 *   const device = v2.fromDiscovery(response, { token: stored.token, identifier: stored.identifier });
 * });
 */
export function fromDiscovery(
  response: Pick<DiscoveryResponse, 'ip' | 'txt'>,
  options: DeviceOptions,
): DiscoveredDevice {
  const { txt } = response;
  const DeviceClass = DEVICE_CLASSES[txt.product_type];

  if (!DeviceClass) {
    throw new HomeWizardEnergyApiError(
      `There is no API v2 device class for product type "${txt.product_type}"`,
    );
  }

  if (options.identifier && options.identifier !== txt.id) {
    throw new HomeWizardEnergyApiError(
      `The discovered device is "${txt.id}", not "${options.identifier}"`,
    );
  }

  return new DeviceClass(response.ip, options);
}
