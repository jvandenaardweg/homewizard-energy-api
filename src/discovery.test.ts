import * as multicastDns from 'multicast-dns';
import { HomeWizardEnergyDiscovery } from '@/v1/homewizard-energy-discovery';
import { mockApiAgent } from '@/mocks/api';
import { mockMdnsResponse } from '@/mocks/mdns';
import { mockDiscoveryV2Response, mockMdnsV2Response } from '@/mocks/mdns-v2';
import { KwhMeter1Phase, KwhMeter3Phase } from './devices/kwh-meter';
import { P1Meter } from './devices/p1-meter';
import { PlugInBattery } from './devices/plug-in-battery';
import { connect, discover, Discovery } from './discovery';

const querySpy = vi.fn();
const onSpy = vi.fn();
const destroySpy = vi.fn();

vi.mock('multicast-dns', () => ({
  default: () => ({
    query: querySpy,
    on: onSpy,
    removeAllListeners: vi.fn(),
    destroy: destroySpy,
  }),
}));

/** Starts a discovery and returns its mDNS response handler. */
function getResponseHandler(
  discovery: { start(): void; on(event: 'response', callback: () => void): void },
  callback: () => void,
) {
  discovery.start();
  discovery.on('response', callback);

  return lastHandler('response') as (response: multicastDns.ResponsePacket) => void;
}

/** Returns the last mDNS handler registered for `event`. */
function lastHandler(event: string) {
  return onSpy.mock.calls.filter(([name]) => name === event).at(-1)?.[1] as (
    value: unknown,
  ) => void;
}

describe('discover', () => {
  it('should yield the discovered devices, and stop mDNS after a break', async () => {
    const devices = discover();
    const next = devices.next();

    lastHandler('response')(mockMdnsV2Response);

    await expect(next).resolves.toStrictEqual({ value: mockDiscoveryV2Response, done: false });
    await devices.return?.();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should end after the timeout', async () => {
    const devices = discover({ timeout: 10000 });
    const next = devices.next();

    await vi.advanceTimersByTimeAsync(10000);

    await expect(next).resolves.toStrictEqual({ value: undefined, done: true });
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should end when the signal aborts, and not start when it was aborted already', async () => {
    const controller = new AbortController();
    const next = discover({ signal: controller.signal }).next();

    controller.abort();
    await expect(next).resolves.toStrictEqual({ value: undefined, done: true });

    querySpy.mockClear();
    await expect(discover({ signal: AbortSignal.abort() }).next()).resolves.toStrictEqual({
      value: undefined,
      done: true,
    });
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('should throw a network error when mDNS fails', async () => {
    const next = discover().next();
    const cause = new Error('EADDRINUSE');

    lastHandler('error')(cause);

    await expect(next).rejects.toMatchObject({
      kind: 'network',
      message: 'mDNS discovery failed: EADDRINUSE',
      cause,
    });
  });
});

describe('Discovery', () => {
  it('should query _homewizard._tcp', () => {
    new Discovery().start();

    expect(querySpy).toHaveBeenCalledWith('_homewizard._tcp.local', 'PTR');
  });

  it('should emit a device on _homewizard._tcp with its txt record', () => {
    const callback = vi.fn();
    const handler = getResponseHandler(new Discovery({ logger: { method: vi.fn() } }), callback);

    handler(mockMdnsV2Response);

    expect(callback).toHaveBeenCalledWith(mockDiscoveryV2Response);
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
  const credentials = {
    host: '192.168.1.99',
    token: 'x',
    identifier: mockDiscoveryV2Response.txt.id,
  };
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
      {
        ...mockDiscoveryV2Response,
        txt: { ...mockDiscoveryV2Response.txt, product_type: productType },
      },
      credentials,
      options,
    );

    expect(device).toBeInstanceOf(DeviceClass);
  });

  it('should use the discovered IP instead of the stored host, and the stored identifier', () => {
    const device = connect(mockDiscoveryV2Response, credentials, options);
    const { client } = device as unknown as {
      client: { baseUrl: string; options: { identifier: string } };
    };

    expect(device.host).toBe('192.168.1.35');
    expect(client.baseUrl).toBe('https://192.168.1.35');
    expect(client.options.identifier).toBe('appliance/p1dongle/3c39e7aabb02');
  });

  it('should refuse a txt record that names a property of Object, or announces no identifier', () => {
    expect(() =>
      connect(
        {
          ...mockDiscoveryV2Response,
          txt: { ...mockDiscoveryV2Response.txt, product_type: 'constructor' },
        },
        credentials,
        options,
      ),
    ).toThrow(
      expect.objectContaining({ kind: 'invalid', message: expect.stringMatching(/"constructor"/) }),
    );

    const { id: _id, ...withoutId } = mockDiscoveryV2Response.txt;
    expect(() =>
      connect(
        { ...mockDiscoveryV2Response, txt: withoutId as typeof mockDiscoveryV2Response.txt },
        credentials,
        options,
      ),
    ).toThrow(
      expect.objectContaining({
        kind: 'certificate',
        message: expect.stringMatching(/announces no identifier/),
      }),
    );
  });

  it('should accept the stored identifier in another case', () => {
    const upper = { ...credentials, identifier: mockDiscoveryV2Response.txt.id.toUpperCase() };

    expect(connect(mockDiscoveryV2Response, upper, options)).toBeInstanceOf(P1Meter);
  });

  it('should refuse a device announced with another identifier, so the token is not sent to it', () => {
    expect(() =>
      connect(
        mockDiscoveryV2Response,
        { ...credentials, identifier: 'appliance/p1dongle/000000000000' },
        options,
      ),
    ).toThrow(
      expect.objectContaining({
        kind: 'certificate',
        message:
          'The discovered device is "appliance/p1dongle/3c39e7aabb02", not "appliance/p1dongle/000000000000"',
      }),
    );
  });

  it('should not take the identifier from discovery', () => {
    expect(() => connect(mockDiscoveryV2Response, { token: 'x' }, options)).toThrow(
      /"identifier" of the credentials is required/,
    );
  });

  it('should allow a missing identifier with insecure', () => {
    expect(
      connect(mockDiscoveryV2Response, {}, { insecure: true, dispatcher: mockApiAgent }),
    ).toBeInstanceOf(P1Meter);
  });

  it('should throw for a product type without a device class', () => {
    expect(() =>
      connect(
        {
          ...mockDiscoveryV2Response,
          txt: { ...mockDiscoveryV2Response.txt, product_type: 'HWE-SKT' },
        },
        credentials,
        options,
      ),
    ).toThrow('There is no device class for product type "HWE-SKT"');
  });
});
