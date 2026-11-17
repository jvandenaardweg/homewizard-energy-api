import { AsyncQueue } from '@/shared/async-queue';
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

export interface DiscoverOptions extends DiscoveryOptions {
  /** Ends the discovery after this many milliseconds. Without it, it runs until the loop ends or `signal` aborts. */
  timeout?: number;
  /** Ends the discovery, like a `break` in the loop. */
  signal?: AbortSignal;
}

/**
 * Discovers the devices with the API v2 as an async iterator, for `for await`. Each device is yielded once, and
 * again when its txt record or IP address changes. Discovery stops when the loop ends, `timeout` passes or
 * `signal` aborts. It throws a `HomeWizardError` with kind `network` when mDNS fails.
 *
 * @example
 * for await (const found of discover({ timeout: 10000 })) {
 *   console.log(found.ip, found.txt.product_type);
 * }
 */
export function discover(options: DiscoverOptions = {}): AsyncIterableIterator<DiscoveryResponse> {
  const { timeout, signal } = options;
  const discovery = new Discovery(options);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const queue = new AsyncQueue<DiscoveryResponse>(() => {
    clearTimeout(timer);
    discovery.stop();
  }).endOn(signal);

  if (queue.isDone) return queue;

  discovery.start();
  discovery.on('response', found => queue.push(found));
  discovery.on('error', error =>
    queue.fail(
      new HomeWizardError('network', `mDNS discovery failed: ${error.message}`, { cause: error }),
    ),
  );

  if (timeout) timer = setTimeout(() => queue.end(), timeout);

  return queue;
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
      'certificate',
      `The discovered device is "${txt.id}", not "${credentials.identifier}"`,
    );
  }

  return new DeviceClass(
    { host: found.ip, token: credentials.token, identifier: credentials.identifier },
    options,
  );
}
