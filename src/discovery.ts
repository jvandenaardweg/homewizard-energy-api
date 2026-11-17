import { LoggerOptions } from '@/shared/logger';
import { MdnsDiscovery, MdnsDiscoveryResponse } from '@/shared/mdns-discovery';
import { Credentials, DeviceOptions } from './client';
import { HomeWizardError } from './errors';
import { KwhMeter1Phase, KwhMeter3Phase } from './devices/kwh-meter';
import { P1Meter } from './devices/p1-meter';
import { PlugInBattery } from './devices/plug-in-battery';
import { MDNS_DISCOVERY_TYPE, MdnsTxtRecord, ProductType } from './types';

/**
 * A device found on `_homewizard._tcp`. Pass it to `connect()` to get its device class.
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
 * const discovery = new Discovery();
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
  ProductType,
  new (credentials: Credentials, options?: DeviceOptions) => DiscoveredDevice
> = {
  'HWE-P1': P1Meter,
  'HWE-KWH1': KwhMeter1Phase,
  'SDM230-wifi': KwhMeter1Phase,
  'HWE-KWH3': KwhMeter3Phase,
  'SDM630-wifi': KwhMeter3Phase,
  'HWE-BAT': PlugInBattery,
};

/**
 * Connects to a device you paired before, at the IP address it was discovered at: returns its device class, set
 * up with the stored token and identifier. Check the class with `instanceof`, for example
 * `device instanceof P1Meter`. The `host` of the credentials is ignored, since the device may have a new IP
 * address: store `device.host` for next time.
 *
 * Anyone on the network can announce a device, so the discovered `id` is not trusted as the identifier: a
 * device announced with another `id` throws, so your token is never sent to another device. Throws too for a
 * product type without a device class.
 *
 * To pair with a discovered device, pass its IP to `pair()`, which reads the identifier from the certificate.
 *
 * @example
 * discovery.on('response', found => {
 *   if (found.txt.id !== credentials.identifier) return;
 *
 *   const device = connect(found, credentials);
 * });
 */
export function connect(
  found: Pick<DiscoveryResponse, 'ip' | 'txt'>,
  credentials: Omit<Credentials, 'host'>,
  options?: DeviceOptions,
): DiscoveredDevice {
  const { txt } = found;
  const DeviceClass = DEVICE_CLASSES[txt.product_type as ProductType];

  if (!DeviceClass) {
    throw new HomeWizardError(
      'invalid',
      `There is no device class for product type "${txt.product_type}"`,
    );
  }

  if (credentials.identifier && credentials.identifier !== txt.id) {
    throw new HomeWizardError(
      'invalid',
      `The discovered device is "${txt.id}", not "${credentials.identifier}"`,
    );
  }

  return new DeviceClass(
    { host: found.ip, token: credentials.token, identifier: credentials.identifier },
    options,
  );
}
