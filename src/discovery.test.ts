import { mockApiAgent } from '@/mocks/agent';
import {
  mockDiscoveryV2Response,
  mockMdnsBothServicesResponse,
  mockMdnsV1OnlyResponse,
  mockMdnsV2Response,
} from '@/mocks/mdns-v2';
import { mockV2DeviceInformation } from '@/mocks/data/v2';
import { mockTlsCa, mockTlsIdentifier, startMockTlsServer } from '@/mocks/tls/server';
import { KwhMeter1Phase, KwhMeter3Phase } from './devices/kwh-meter';
import { P1Meter } from './devices/p1-meter';
import { PlugInBattery } from './devices/plug-in-battery';
import { connect, discover } from './discovery';

const querySpy = vi.fn();
const onSpy = vi.fn();
const destroySpy = vi.fn();
let mdnsFailsToStart = false;

vi.mock('multicast-dns', () => ({
  default: () => {
    if (mdnsFailsToStart) throw new Error('bind EACCES');

    return {
      query: querySpy,
      on: onSpy,
      removeAllListeners: vi.fn(),
      destroy: destroySpy,
    };
  },
}));

/** Starts a discovery, and waits until it has loaded and started mDNS. */
async function startDiscover(options?: Parameters<typeof discover>[0]) {
  const devices = discover(options);
  await vi.dynamicImportSettled();

  return devices;
}

/** Returns the last mDNS handler registered for `event`. */
function lastHandler(event: string) {
  return onSpy.mock.calls.filter(([name]) => name === event).at(-1)?.[1] as (
    value: unknown,
  ) => void;
}

describe('discover', () => {
  it('should yield the discovered devices, and stop mDNS after a break', async () => {
    const devices = await startDiscover();
    const next = devices.next();

    lastHandler('response')(mockMdnsV2Response);

    await expect(next).resolves.toStrictEqual({ value: mockDiscoveryV2Response, done: false });
    await devices.return?.();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should not start mDNS when the loop ended while it was loading', async () => {
    const devices = discover();
    await devices.return?.();
    await vi.dynamicImportSettled();

    expect(querySpy).not.toHaveBeenCalled();
  });

  it('should throw a network error when mDNS fails to start', async () => {
    mdnsFailsToStart = true;

    try {
      await expect(discover().next()).rejects.toMatchObject({
        kind: 'network',
        message: 'mDNS discovery failed: Error: bind EACCES',
      });
    } finally {
      mdnsFailsToStart = false;
    }
  });

  it('should end after the timeout', async () => {
    const devices = await startDiscover({ timeout: 10000 });
    const next = devices.next();

    await vi.advanceTimersByTimeAsync(10000);

    await expect(next).resolves.toStrictEqual({ value: undefined, done: true });
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should end when the signal aborts, and not start when it was aborted already', async () => {
    const controller = new AbortController();
    const next = (await startDiscover({ signal: controller.signal })).next();

    controller.abort();
    await expect(next).resolves.toStrictEqual({ value: undefined, done: true });

    querySpy.mockClear();
    await expect(discover({ signal: AbortSignal.abort() }).next()).resolves.toStrictEqual({
      value: undefined,
      done: true,
    });
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('should yield a device again when it moves back to an IP address it had before', async () => {
    const devices = await startDiscover({ timeout: 10000 });
    const atIp = (ip: string) => ({
      ...mockMdnsV2Response,
      additionals: [{ ...mockMdnsV2Response.additionals[0], data: ip }],
    });

    lastHandler('response')(atIp('192.168.1.35'));
    lastHandler('response')(atIp('192.168.1.36'));
    lastHandler('response')(atIp('192.168.1.35'));
    await vi.advanceTimersByTimeAsync(10000);

    const ips = [];
    for await (const found of devices) ips.push(found.ip);

    expect(ips).toStrictEqual(['192.168.1.35', '192.168.1.36', '192.168.1.35']);
  });

  it('should throw a network error when mDNS fails', async () => {
    const next = (await startDiscover()).next();
    const cause = new Error('EADDRINUSE');

    lastHandler('error')(cause);

    await expect(next).rejects.toMatchObject({
      kind: 'network',
      message: 'mDNS discovery failed: Error: EADDRINUSE',
      cause,
    });
  });
});

describe('the service types', () => {
  it('should query _homewizard._tcp, and ignore a device on _hwenergy._tcp', async () => {
    const method = vi.fn();
    const devices = await startDiscover({ logger: { method } });
    const next = devices.next();

    expect(querySpy).toHaveBeenCalledWith('_homewizard._tcp.local', 'PTR');

    lastHandler('response')(mockMdnsV1OnlyResponse);
    lastHandler('response')(mockMdnsV2Response);

    await expect(next).resolves.toStrictEqual({ value: mockDiscoveryV2Response, done: false });
    expect(JSON.stringify(method.mock.calls)).toContain('is not for _homewizard._tcp.local');
    await devices.return?.();
  });

  it('should read the TXT record of _homewizard._tcp when a packet announces both services', async () => {
    const devices = await startDiscover();
    const next = devices.next();

    lastHandler('response')(mockMdnsBothServicesResponse);

    await expect(next).resolves.toStrictEqual({ value: mockDiscoveryV2Response, done: false });
    await devices.return?.();
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

  it('should use the discovered IP instead of the stored host', () => {
    const device = connect(mockDiscoveryV2Response, credentials, options);
    const { client } = device as unknown as { client: { baseUrl: string } };

    expect(device.host).toBe('192.168.1.35');
    expect(client.baseUrl).toBe('https://192.168.1.35');
  });

  it('should still check the certificate when the txt record announces the stored identifier', async () => {
    vi.useRealTimers();
    const server = await startMockTlsServer((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(mockV2DeviceInformation['HWE-P1']));
    });
    const found = {
      ip: server.host,
      txt: { ...mockDiscoveryV2Response.txt, id: mockTlsIdentifier },
    };
    const connectToFound = () =>
      connect(found, { token: 'x', identifier: mockTlsIdentifier }, { ca: mockTlsCa, retries: 0 });

    try {
      const paired = connectToFound();
      await expect(paired.getDevice()).resolves.toMatchObject({ product_type: 'HWE-P1' });
      await paired.close();

      // Anyone can announce the identifier: another device at the address fails the certificate check
      server.useOtherDevice();
      const other = connectToFound();
      await expect(other.getDevice()).rejects.toMatchObject({ kind: 'certificate' });
      await other.close();
    } finally {
      await server.close();
      // The global afterEach in vitest.setup.ts runs the fake timers
      vi.useFakeTimers();
    }
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

  it('should not take the identifier from discovery, as credentials from JSON can miss it', () => {
    const withoutIdentifier = { token: 'x' } as typeof credentials;

    expect(() => connect(mockDiscoveryV2Response, withoutIdentifier, options)).toThrow(
      /"identifier" of the credentials is required/,
    );
  });

  it('should allow an empty identifier with insecure', () => {
    expect(
      connect(
        mockDiscoveryV2Response,
        { token: 'x', identifier: '' },
        { insecure: true, dispatcher: mockApiAgent },
      ),
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
