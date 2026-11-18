import * as multicastDns from 'multicast-dns';
import { mockDiscoveryV2Response, mockMdnsV2Response } from '@/mocks/mdns-v2';
import { MdnsDiscovery } from './mdns-discovery';

type Answer = multicastDns.ResponsePacket['answers'][number];

const FQDN = 'p1meter-AABB02._homewizard._tcp.local';

const onSpy = vi.fn();
const querySpy = vi.fn();
const destroySpy = vi.fn();

vi.mock('multicast-dns', () => ({
  default: () => ({ query: querySpy, on: onSpy, removeAllListeners: vi.fn(), destroy: destroySpy }),
}));

const [ptr, srv, txt] = mockMdnsV2Response.answers as [Answer, Answer, Answer];
const aRecord = mockMdnsV2Response.additionals[0] as Answer;

/** A packet with these answers and additionals. */
const packet = (answers: unknown[], additionals: unknown[] = []): multicastDns.ResponsePacket => ({
  ...mockMdnsV2Response,
  answers: answers as Answer[],
  additionals: additionals as Answer[],
});

const goodbyePacket = packet([{ ...ptr, ttl: 0 }]);
const otherHost = { ...aRecord, name: 'other.local', data: '10.0.0.9' } as Answer;
const otherPtr = { ...ptr, data: 'p1meter-OTHER._homewizard._tcp.local' } as Answer;

describe('MdnsDiscovery', () => {
  let discovery: MdnsDiscovery<{ product_type?: string }>;

  beforeEach(() => {
    discovery = new MdnsDiscovery('homewizard');
  });

  it('should query the service domain, and reuse mDNS when started twice', () => {
    discovery.start();
    const mdns = discovery['mdns'];
    discovery.start();

    expect(discovery['mdns']).toBe(mdns);
    expect(querySpy).toHaveBeenCalledTimes(2);
    expect(querySpy).toHaveBeenCalledWith('_homewizard._tcp.local', 'PTR');

    discovery.stop();
    discovery.stop();
    expect(destroySpy).toHaveBeenCalledOnce();
  });

  it('should throw when on() is called before start()', () => {
    expect(() => discovery.on('response', vi.fn())).toThrow('mDNS is not started');
  });

  it('should forward mDNS errors and warnings', () => {
    const onError = vi.fn();
    const onWarning = vi.fn();
    const error = new Error('mDNS error');

    discovery.start();
    discovery.on('error', onError);
    discovery.on('warning', onWarning);
    onSpy.mock.calls[0][1](error);
    onSpy.mock.calls[1][1](error);

    expect(onError).toHaveBeenCalledWith(error);
    expect(onWarning).toHaveBeenCalledWith(error);
  });

  describe('the response handler', () => {
    let callback: ReturnType<typeof vi.fn<(found: unknown) => void>>;
    let handle: (response: multicastDns.ResponsePacket) => void;
    let log: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

    beforeEach(() => {
      log = vi.fn();
      discovery = new MdnsDiscovery('homewizard', { method: log });
      callback = vi.fn();
      handle = discovery['handleMdnsResponse'](callback);
    });

    it('should call back once for an unchanged repeat, and again after a goodbye', () => {
      handle(mockMdnsV2Response);
      handle(mockMdnsV2Response);
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(mockDiscoveryV2Response);

      handle(goodbyePacket);
      expect(discovery['cachedDiscoveryResponses']).toStrictEqual([]);

      handle(mockMdnsV2Response);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should keep one cache entry per device, whatever the case of its fqdn', () => {
      handle(mockMdnsV2Response);
      handle(packet([ptr, srv, txt], [{ ...aRecord, data: '192.168.1.36' }]));
      expect(discovery['cachedDiscoveryResponses']).toHaveLength(1);

      handle(packet([{ ...ptr, ttl: 0, data: FQDN.toUpperCase() }]));
      expect(discovery['cachedDiscoveryResponses']).toStrictEqual([]);
    });

    it('should ignore a goodbye of a device it has not seen', () => {
      handle(goodbyePacket);

      expect(callback).not.toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).toContain(`No cached response found for ${FQDN}`);
    });

    it.each<[string, multicastDns.ResponsePacket]>([
      [
        'a service type that ends with this one',
        packet(
          [
            { ...ptr, name: '_xhomewizard._tcp.local', data: 'x._xhomewizard._tcp.local' },
            { ...txt, name: undefined },
          ],
          [aRecord],
        ),
      ],
      [
        'only the TXT record of another device',
        packet([ptr, srv, { ...txt, name: 'p1meter-OTHER._homewizard._tcp.local' }], [aRecord]),
      ],
      ['an SRV whose target has no A record', packet([ptr, srv, txt], [otherHost])],
      [
        'records that are no records',
        packet([null, 5, ptr, { type: 'SRV', name: FQDN }, txt], [null]),
      ],
      [
        'no sections',
        { ...mockMdnsV2Response, answers: undefined, additionals: undefined } as never,
      ],
    ])('should ignore %s without throwing', (_name, response) => {
      expect(() => handle(response)).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
      expect(discovery['cachedDiscoveryResponses']).toStrictEqual([]);
    });

    it('should take the host of the SRV target, not the first A record', () => {
      handle(packet([ptr, srv, txt], [otherHost, aRecord]));

      expect(callback).toHaveBeenCalledWith(mockDiscoveryV2Response);
    });

    it('should decide a goodbye per device', () => {
      handle(packet([ptr, { ...otherPtr, ttl: 0 }, srv, txt], [aRecord]));

      expect(callback).toHaveBeenCalledWith(mockDiscoveryV2Response);
    });
  });

  describe('the finders', () => {
    it('should find the PTR, fqdn, goodbye and host by exact name', () => {
      const suffixed = packet([{ ...ptr, name: '_xhomewizard._tcp.local' }]);

      expect(discovery['isServiceResponse'](mockMdnsV2Response)).toBe(true);
      expect(discovery['isServiceResponse'](suffixed)).toBe(false);
      expect(discovery['getFqdnFromResponse'](mockMdnsV2Response)).toBe(FQDN);
      expect(discovery['getFqdnFromResponse'](suffixed)).toBeNull();
      expect(discovery['isGoodbyeResponse'](goodbyePacket)).toBe(true);
      expect(discovery['isGoodbyeResponse'](mockMdnsV2Response)).toBe(false);
      expect(discovery['isGoodbyeResponse'](packet([{ ...otherPtr, data: 'x', ttl: 0 }]))).toBe(
        false,
      );
      expect(
        discovery['getHostDetailsFromResponse'](packet([ptr, srv], [otherHost, aRecord])),
      ).toStrictEqual({ ip: '192.168.1.35', hostname: 'p1meter-AABB02.local' });
      expect(discovery['getHostDetailsFromResponse'](packet([ptr, srv], [otherHost]))).toBeNull();
      // without a PTR there is no fqdn, so no SRV to follow
      expect(discovery['getHostDetailsFromResponse'](packet([srv], [otherHost]))).toStrictEqual({
        ip: '10.0.0.9',
        hostname: 'other.local',
      });
      expect(discovery['getHostDetailsFromAnswer'](aRecord)).toStrictEqual({
        ip: '192.168.1.35',
        hostname: 'p1meter-AABB02.local',
      });
    });

    it('should find a cached device by its fqdn without case', () => {
      discovery['cachedDiscoveryResponses'] = [mockDiscoveryV2Response];

      expect(discovery['getCachedResponseByFqdn'](FQDN.toUpperCase())).toBe(
        mockDiscoveryV2Response,
      );
      expect(discovery['isDiscoveryResponseInCache'](mockDiscoveryV2Response)).toBe(true);
    });
  });
});

const txtAnswer = mockMdnsV2Response.answers.find(answer => answer.type === 'TXT')!;

/** `mockMdnsV2Response` with its TXT record renamed. */
const withTxtName = (name: string | undefined): multicastDns.ResponsePacket => ({
  ...mockMdnsV2Response,
  answers: mockMdnsV2Response.answers.map(answer =>
    answer.type === 'TXT' ? { ...answer, name } : answer,
  ) as Answer[],
});

describe('MdnsDiscovery TXT record lookup', () => {
  let discovery: MdnsDiscovery<{ product_type?: string }>;

  beforeEach(() => {
    discovery = new MdnsDiscovery('homewizard');
  });

  it('should find the TXT record in the additional section', () => {
    const response = {
      ...mockMdnsV2Response,
      answers: mockMdnsV2Response.answers.filter(answer => answer.type !== 'TXT'),
      additionals: [...mockMdnsV2Response.additionals, txtAnswer],
    };

    expect(discovery['getTxtRecordFromResponse'](response)).toMatchObject({
      product_type: 'HWE-P1',
    });
  });

  it('should prefer the TXT record of the fqdn, without case', () => {
    const other = {
      ...txtAnswer,
      name: 'p1meter-OTHER._homewizard._tcp.local',
      data: [Buffer.from('product_type=HWE-KWH1')],
    } as Answer;
    const response = { ...mockMdnsV2Response, answers: [other, ...mockMdnsV2Response.answers] };

    expect(
      discovery['getTxtRecordFromResponse'](response, 'P1Meter-AABB02._homewizard._tcp.local'),
    ).toMatchObject({ product_type: 'HWE-P1' });
  });

  it('should match the fqdn and the service with a trailing dot', () => {
    expect(discovery['findTxtRecord'](withTxtName(`${FQDN}.`), FQDN)).toBeDefined();
    expect(discovery['getTxtRecordFromResponse'](withTxtName(`${FQDN}.`))).toMatchObject({
      product_type: 'HWE-P1',
    });
  });

  it('should only take the service type as the suffix of the name', () => {
    expect(
      discovery['getTxtRecordFromResponse'](withTxtName('x._homewizard._udp.local')),
    ).toBeNull();
    expect(
      discovery['findTxtRecord'](withTxtName('x._homewizard._tcp.example.com')),
    ).toBeUndefined();
    expect(
      discovery['findTxtRecord'](withTxtName('x._homewizard._tcp.example.com'), FQDN),
    ).toBeUndefined();
  });

  it('should not take a service type that ends with this one as this service', () => {
    expect(
      discovery['getTxtRecordFromResponse'](withTxtName('x._xhomewizard._tcp.local')),
    ).toBeNull();
  });

  it('should not use the TXT record of another service', () => {
    expect(
      discovery['getTxtRecordFromResponse'](withTxtName('p1meter-AABB02._hwenergy._tcp.local')),
    ).toBeNull();
    expect(discovery['findTxtRecord'](withTxtName('x._hwenergy._tcp.example.com'))).toBeUndefined();
  });

  it('should read a response without answer or additional section', () => {
    const { additionals: _additionals, ...withoutAdditionals } = mockMdnsV2Response;
    const { answers: _answers, ...withoutAnswers } = mockMdnsV2Response;

    expect(
      discovery['getTxtRecordFromResponse'](withoutAdditionals as multicastDns.ResponsePacket),
    ).toMatchObject({ product_type: 'HWE-P1' });
    expect(
      discovery['getTxtRecordFromResponse'](withoutAnswers as multicastDns.ResponsePacket),
    ).toBeNull();
  });

  it('should still use a TXT record that names no service', () => {
    expect(discovery['getTxtRecordFromResponse'](withTxtName(undefined))).toMatchObject({
      product_type: 'HWE-P1',
    });
    expect(discovery['findTxtRecord'](withTxtName('p1meter-AABB02.local'))).toBeDefined();
  });
});
