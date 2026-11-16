import * as multicastDns from 'multicast-dns';
import { HomeWizardEnergyDiscovery } from '@/v1/homewizard-energy-discovery';
import { mockApiAgent } from '@/mocks/api';
import { mockMdnsResponse } from '@/mocks/mdns';
import { mockMdnsV2Response } from '@/mocks/mdns-v2';
import { KwhMeter1Phase, KwhMeter3Phase } from './devices/kwh-meter';
import { P1Meter } from './devices/p1-meter';
import { PlugInBattery } from './devices/plug-in-battery';
import { connect, Discovery, DiscoveryResponse } from './discovery';

const querySpy = vi.fn();
const onSpy = vi.fn();

vi.mock('multicast-dns', () => ({
  default: () => ({
    query: querySpy,
    on: onSpy,
    removeAllListeners: vi.fn(),
    destroy: vi.fn(),
  }),
}));

/** Starts a discovery and returns its mDNS response handler. */
function getResponseHandler(
  discovery: { start(): void; on(event: 'response', callback: () => void): void },
  callback: () => void,
) {
  discovery.start();
  discovery.on('response', callback);

  return onSpy.mock.calls.at(-1)?.[1] as (response: multicastDns.ResponsePacket) => void;
}

const discovered: DiscoveryResponse = {
  ip: '192.168.1.35',
  hostname: 'p1meter-AABB02.local',
  fqdn: 'p1meter-AABB02._homewizard._tcp.local',
  txt: {
    serial: '3c39e7aabb02',
    product_type: 'HWE-P1',
    product_name: 'P1 Meter',
    id: 'appliance/p1dongle/3c39e7aabb02',
    api_version: '2.2.0',
  },
};

describe('v2.Discovery', () => {
  it('should query _homewizard._tcp', () => {
    new Discovery().start();

    expect(querySpy).toHaveBeenCalledWith('_homewizard._tcp.local', 'PTR');
  });

  it('should emit a device on _homewizard._tcp with its txt record', () => {
    const callback = vi.fn();
    const handler = getResponseHandler(new Discovery({ logger: { method: vi.fn() } }), callback);

    handler(mockMdnsV2Response);

    expect(callback).toHaveBeenCalledWith(discovered);
  });

  it('should ignore a device on _hwenergy._tcp', () => {
    const callback = vi.fn();
    const handler = getResponseHandler(new Discovery(), callback);

    handler(mockMdnsResponse);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should leave _homewizard._tcp to the v2 discovery in the v1 discovery', () => {
    const callback = vi.fn();
    const handler = getResponseHandler(new HomeWizardEnergyDiscovery(), callback);

    handler(mockMdnsV2Response);

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('connect', () => {
  const credentials = { host: '192.168.1.99', token: 'x', identifier: discovered.txt.id };
  const options = { dispatcher: mockApiAgent };

  it.each([
    ['HWE-P1', P1Meter],
    ['HWE-KWH1', KwhMeter1Phase],
    ['SDM230-wifi', KwhMeter1Phase],
    ['HWE-KWH3', KwhMeter3Phase],
    ['SDM630-wifi', KwhMeter3Phase],
    ['HWE-BAT', PlugInBattery],
  ])('should return the device class for %s', (productType, DeviceClass) => {
    const device = connect(
      { ...discovered, txt: { ...discovered.txt, product_type: productType } },
      credentials,
      options,
    );

    expect(device).toBeInstanceOf(DeviceClass);
  });

  it('should use the discovered IP instead of the stored host, and the stored identifier', () => {
    const device = connect(discovered, credentials, options);
    const { client } = device as unknown as {
      client: { baseUrl: string; options: { identifier: string } };
    };

    expect(device.host).toBe('192.168.1.35');
    expect(client.baseUrl).toBe('https://192.168.1.35');
    expect(client.options.identifier).toBe('appliance/p1dongle/3c39e7aabb02');
  });

  it('should refuse a device announced with another identifier, so the token is not sent to it', () => {
    expect(() =>
      connect(
        discovered,
        { ...credentials, identifier: 'appliance/p1dongle/000000000000' },
        options,
      ),
    ).toThrow(
      'The discovered device is "appliance/p1dongle/3c39e7aabb02", not "appliance/p1dongle/000000000000"',
    );
  });

  it('should not take the identifier from discovery', () => {
    expect(() => connect(discovered, { token: 'x' }, options)).toThrow(
      /"identifier" option is required/,
    );
  });

  it('should allow a missing identifier with insecure', () => {
    expect(connect(discovered, {}, { insecure: true, dispatcher: mockApiAgent })).toBeInstanceOf(
      P1Meter,
    );
  });

  it('should throw for a product type without a device class', () => {
    expect(() =>
      connect(
        { ...discovered, txt: { ...discovered.txt, product_type: 'HWE-SKT' } },
        credentials,
        options,
      ),
    ).toThrow('There is no device class for product type "HWE-SKT"');
  });
});
