import * as multicastDns from 'multicast-dns';
import {
  mockDiscoveryV2Response,
  mockMdnsBothServicesResponse,
  mockMdnsV1AnswersOfV2Device,
  mockMdnsV1OnlyResponse,
  mockMdnsV2Response,
} from '@/mocks/mdns-v2';
import { MdnsDiscovery } from './mdns-discovery';
import { isSameName } from './mdns-discovery-packet';

type Answer = multicastDns.ResponsePacket['answers'][number];

const V2 = '_homewizard._tcp.local';
const V1 = '_hwenergy._tcp.local';
const FQDN = 'p1meter-AABB02._homewizard._tcp.local';

const [ptr, srv, txt] = mockMdnsV2Response.answers as [Answer, Answer, Answer];
const aRecord = mockMdnsV2Response.additionals[0] as Answer;

/** A packet with these answers and additionals. */
const packet = (answers: unknown[], additionals: unknown[] = []): multicastDns.ResponsePacket => ({
  ...mockMdnsV2Response,
  answers: answers as Answer[],
  additionals: additionals as Answer[],
});

const otherHost = { ...aRecord, name: 'other.local', data: '10.0.0.9' } as Answer;
const otherPtr = { ...ptr, data: 'p1meter-OTHER._homewizard._tcp.local' } as Answer;

const device = (fields: Partial<typeof mockDiscoveryV2Response> = {}) => ({
  kind: 'device',
  device: { ...mockDiscoveryV2Response, ...fields },
});
const goodbye = (fqdn: string) => ({ kind: 'goodbye', fqdn });
const ignore = (reason: string | RegExp) => ({
  kind: 'ignore',
  reason: typeof reason === 'string' ? reason : expect.stringMatching(reason),
});

/**
 * What the response handler of `MdnsDiscovery` makes of one packet: the device it calls back with, the fqdn of a
 * goodbye, or the reason it logs for ignoring the packet.
 */
function readMdnsPacket(response: multicastDns.ResponsePacket, serviceDomain: string) {
  const lines: string[] = [];
  const discovery = new MdnsDiscovery<object>(serviceDomain.split('.')[0]!.slice(1), {
    method: (_prefix, line) => lines.push(String(line)),
  });
  const goodbyes = vi.spyOn(
    discovery as unknown as { getCachedResponseByFqdn: (fqdn: string) => unknown },
    'getCachedResponseByFqdn',
  );
  const callback = vi.fn();

  discovery['handleMdnsResponse'](callback)(response);

  if (callback.mock.calls.length) return { kind: 'device', device: callback.mock.calls[0]?.[0] };
  if (goodbyes.mock.calls.length) return { kind: 'goodbye', fqdn: goodbyes.mock.calls[0]?.[0] };

  return {
    kind: 'ignore',
    reason: lines.map(line => /^(.*?), ignoring/.exec(line)?.[1]).find(Boolean),
  };
}

describe('reading a packet in MdnsDiscovery', () => {
  it.each<[string, multicastDns.ResponsePacket, string, unknown]>([
    ['a packet of the service', mockMdnsV2Response, V2, device()],
    [
      'a packet with both services, the API v1 records first',
      mockMdnsBothServicesResponse,
      V2,
      device(),
    ],
    [
      'a packet with both services, the API v2 records first',
      packet([...mockMdnsV2Response.answers, ...mockMdnsV1AnswersOfV2Device], [aRecord]),
      V2,
      device(),
    ],
    [
      'a packet with both services, read for the other service',
      mockMdnsBothServicesResponse,
      V1,
      device({
        fqdn: 'p1meter-AABB02._hwenergy._tcp.local',
        txt: {
          api_enabled: '1',
          path: '/api/v1',
          serial: '3c39e7aabb02',
          product_name: 'P1 Meter',
          product_type: 'HWE-P1',
        } as never,
      }),
    ],
    [
      'a packet of another service only',
      mockMdnsV1OnlyResponse,
      V2,
      ignore(`Response from mDNS is not for ${V2}`),
    ],
    [
      'names in other case and with the trailing dot',
      packet(
        [
          {
            ...ptr,
            name: '_HomeWizard._TCP.local.',
            data: 'P1Meter-AABB02._homewizard._tcp.local.',
          },
          { ...srv, name: 'p1meter-aabb02._homewizard._tcp.local' },
          { ...txt, name: 'P1METER-AABB02._HOMEWIZARD._TCP.LOCAL.' },
        ],
        [{ ...aRecord, name: 'P1METER-AABB02.local.' }],
      ),
      V2,
      device({
        fqdn: 'P1Meter-AABB02._homewizard._tcp.local.',
        hostname: 'P1METER-AABB02.local.',
      }),
    ],
    [
      'a service type that ends with this one',
      packet(
        [
          { ...ptr, name: '_xhomewizard._tcp.local', data: 'x._xhomewizard._tcp.local' },
          { ...txt, name: undefined },
        ],
        [aRecord],
      ),
      V2,
      ignore(`Response from mDNS is not for ${V2}`),
    ],
    [
      'a PTR to an instance of another service',
      packet([{ ...ptr, data: 'x._xhomewizard._tcp.local' }, srv, txt], [aRecord]),
      V2,
      ignore('No fqdn found in mDNS response'),
    ],
    [
      'a PTR to the service domain itself',
      packet([{ ...ptr, data: V2 }, srv, txt], [aRecord]),
      V2,
      ignore('No fqdn found in mDNS response'),
    ],
    [
      'the A record of the SRV target, after an A record of another host',
      packet([ptr, srv, txt], [otherHost, aRecord]),
      V2,
      device(),
    ],
    [
      'the A record of the SRV target in the answers',
      packet([ptr, srv, txt, aRecord], [otherHost]),
      V2,
      device(),
    ],
    [
      'the additionals before the answers for the SRV target',
      packet([ptr, srv, txt, { ...aRecord, data: '10.0.0.1' }], [aRecord]),
      V2,
      device(),
    ],
    [
      'an SRV whose target has no A record',
      packet([ptr, srv, txt], [otherHost]),
      V2,
      ignore('No host details found in mDNS response'),
    ],
    [
      'an SRV without a target',
      packet([ptr, { ...srv, data: null }, txt], [aRecord]),
      V2,
      ignore('No host details found in mDNS response'),
    ],
    [
      'no SRV: the first A record',
      packet([ptr, txt], [otherHost, aRecord]),
      V2,
      device({ ip: '10.0.0.9', hostname: 'other.local' }),
    ],
    [
      'no SRV and no A record',
      packet([ptr, txt]),
      V2,
      ignore('No host details found in mDNS response'),
    ],
    ['a goodbye', packet([{ ...ptr, ttl: 0 }]), V2, goodbye(FQDN)],
    [
      'a goodbye of another device of the service, after this one',
      packet([ptr, { ...otherPtr, ttl: 0 }, srv, txt], [aRecord]),
      V2,
      device(),
    ],
    [
      'a goodbye of the other service',
      packet(
        [{ ...mockMdnsV1AnswersOfV2Device[0], ttl: 0 }, ...mockMdnsV2Response.answers],
        [aRecord],
      ),
      V2,
      device(),
    ],
    [
      'a PTR without a ttl',
      packet([{ ...ptr, ttl: undefined }, srv, txt], [aRecord]),
      V2,
      device(),
    ],
    [
      'no TXT record',
      packet([ptr, srv], [aRecord]),
      V2,
      ignore('No txt record data found in mDNS response'),
    ],
    [
      'only the TXT record of another device of the service',
      packet([ptr, srv, { ...txt, name: 'p1meter-OTHER._homewizard._tcp.local' }], [aRecord]),
      V2,
      ignore('No txt record data found in mDNS response'),
    ],
    [
      'only the TXT record of the other service',
      packet([ptr, srv, mockMdnsV1AnswersOfV2Device[2]], [aRecord]),
      V2,
      ignore('No txt record data found in mDNS response'),
    ],
    [
      'a TXT record that names no service, in the additionals',
      packet([ptr, srv], [aRecord, { ...txt, name: 'p1meter-AABB02.local' }]),
      V2,
      device(),
    ],
    [
      'a TXT record whose data is not an array of buffers',
      packet([ptr, srv, { ...txt, data: ['a=b'] }], [aRecord]),
      V2,
      ignore('No txt record data found in mDNS response'),
    ],
    [
      'no additional section',
      { ...packet([ptr, srv, txt, aRecord]), additionals: undefined } as never,
      V2,
      device(),
    ],
    [
      'no answer section',
      { ...packet([], [ptr, srv, txt, aRecord]), answers: undefined } as never,
      V2,
      ignore(`Response from mDNS is not for ${V2}`),
    ],
    [
      'records that are no records',
      packet([null, 5, 'PTR', { type: 'PTR' }, ptr, { type: 'SRV', name: FQDN }, txt], [null]),
      V2,
      ignore('No host details found in mDNS response'),
    ],
    [
      'a PTR whose data is not a string',
      packet([
        { ...ptr, data: 42 },
        { ...ptr, data: undefined },
      ]),
      V2,
      ignore('No fqdn found in mDNS response'),
    ],
  ])('should read %s', (_name, response, serviceDomain, expected) => {
    expect(readMdnsPacket(response, serviceDomain)).toStrictEqual(expected);
  });

  it('should take the first PTR of the service that points at an instance', () => {
    expect(
      readMdnsPacket(packet([{ ...ptr, data: 'nope' }, ptr, srv, txt], [aRecord]), V2),
    ).toStrictEqual(device());
  });

  it('should not throw for a packet that is no packet', () => {
    expect(readMdnsPacket(null as never, V2)).toStrictEqual(
      ignore(`Response from mDNS is not for ${V2}`),
    );
  });
});

describe('isSameName', () => {
  it.each([
    ['_homewizard._tcp.local', '_homewizard._tcp.local', true],
    ['_HomeWizard._tcp.local.', '_homewizard._tcp.local', true],
    ['_xhomewizard._tcp.local', '_homewizard._tcp.local', false],
    [undefined, undefined, false],
    [42, '42', false],
  ])('should compare %s with %s as %s', (a, b, expected) => {
    expect(isSameName(a, b)).toBe(expected);
  });
});
