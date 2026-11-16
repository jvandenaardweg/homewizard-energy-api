import { HomeWizardEnergyDiscovery, isMdnsTxtRecordV2 } from '@/homewizard-energy-discovery';
import { MDNS_DISCOVERY_DOMAIN, MDNS_DISCOVERY_QUERY_TYPE } from '@/types';
import * as multicastDns from 'multicast-dns';
import {
  mockDiscoveryResponse,
  mockMdnsGoodbyeResponse,
  mockMdnsResponse,
  mockMdnsResponseChromecast,
} from './mocks/mdns';

let discoveryService: HomeWizardEnergyDiscovery;

const querySpy = vi.fn();
const onSpy = vi.fn();
const emitSpy = vi.fn();
const removeAllListenersSpy = vi.fn();
const destroySpy = vi.fn();

vi.mock('multicast-dns', () => {
  return {
    default: () => {
      return {
        query: querySpy,
        on: onSpy,
        emit: emitSpy,
        removeAllListeners: removeAllListenersSpy,
        destroy: destroySpy,
      };
    },
  };
});

describe('HomeWizardEnergyDiscovery', () => {
  beforeEach(() => {
    discoveryService = new HomeWizardEnergyDiscovery();
  });

  it('should create a new instance', () => {
    expect(discoveryService).toBeTruthy();
  });

  it('should expose discovery.start', () => {
    expect(discoveryService.start).toBeTruthy();
  });
  it('should expose discovery.stop', () => {
    expect(discoveryService.stop).toBeTruthy();
  });
  it('should expose discovery.on', () => {
    expect(discoveryService.on).toBeTruthy();
  });

  it('should run mdns.query() when start() is invoked', () => {
    discoveryService.start();

    expect(querySpy).toHaveBeenCalledOnce();
    expect(querySpy).toHaveBeenCalledWith(MDNS_DISCOVERY_DOMAIN, MDNS_DISCOVERY_QUERY_TYPE);
  });

  it('should run mdns.removeAllListeners() and mdns.destroy() when stop() is invoked', () => {
    discoveryService.start();
    discoveryService.stop();

    expect(removeAllListenersSpy).toHaveBeenCalledOnce();
    expect(destroySpy).toHaveBeenCalledOnce();
  });

  it('should return an error when on is invoked without start() being invoked first', () => {
    const callbackSpy = vi.fn();
    expect(() => discoveryService.on('response', callbackSpy)).toThrowError(
      'mDNS is not started, call discovery.start() first',
    );

    expect(callbackSpy).not.toHaveBeenCalled();
  });

  it('should trigger the logger invoking a method', async () => {
    const loggerSpy = vi.fn();

    const discoveryServiceWithLogger = new HomeWizardEnergyDiscovery({
      logger: {
        method: loggerSpy,
      },
    });

    discoveryServiceWithLogger.start();

    expect(loggerSpy).toHaveBeenCalled();
  });

  describe('handleMdnsResponse()', () => {
    it('should return a function', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(discoveryService['handleMdnsResponse'](() => {})).toBeInstanceOf(Function);
    });

    it('should call the callback when invoked with a response that is no goodbye response', () => {
      const handleMdnsResponseCallback = vi.fn();

      discoveryService['handleMdnsResponse'](handleMdnsResponseCallback)(mockMdnsResponse);

      expect(handleMdnsResponseCallback).toHaveBeenCalledOnce();
      expect(handleMdnsResponseCallback).toHaveBeenCalledWith(mockDiscoveryResponse);
    });

    it('should not call the callback when invoked with a goodbye response', () => {
      const handleMdnsResponseCallback = vi.fn();

      discoveryService['handleMdnsResponse'](handleMdnsResponseCallback)(mockMdnsGoodbyeResponse);

      expect(handleMdnsResponseCallback).not.toHaveBeenCalled();
    });

    it('should not call the callback when invoked with a response that is no homewizard energy response', () => {
      const handleMdnsResponseCallback = vi.fn();

      discoveryService['handleMdnsResponse'](handleMdnsResponseCallback)(
        mockMdnsResponseChromecast,
      );

      expect(handleMdnsResponseCallback).not.toHaveBeenCalled();
    });

    it('should not call the callback when invoked with a response that misses the answers property', () => {
      const handleMdnsResponseCallback = vi.fn();

      discoveryService['handleMdnsResponse'](handleMdnsResponseCallback)({
        ...mockMdnsResponse,
        answers: undefined as unknown as multicastDns.ResponsePacket['answers'],
      });

      expect(handleMdnsResponseCallback).not.toHaveBeenCalled();
    });

    it('should not call the callback when invoked with a response that misses the fqdn', () => {
      const handleMdnsResponseCallback = vi.fn();

      discoveryService['handleMdnsResponse'](handleMdnsResponseCallback)({
        ...mockMdnsResponse,
        answers: [
          {
            ...mockMdnsResponse.answers[0],
            name: undefined as unknown as string,
          },
        ],
      });

      expect(handleMdnsResponseCallback).not.toHaveBeenCalled();
    });
  });

  describe('handleMdnsError()', () => {
    it('should return a function', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(discoveryService['handleMdnsError'](() => {})).toBeInstanceOf(Function);
    });

    it('should call the callback when invoked with an error', () => {
      const handleMdnsErrorCallback = vi.fn();

      const mockError = new Error('Some error');

      discoveryService['handleMdnsError'](handleMdnsErrorCallback)(mockError);

      expect(handleMdnsErrorCallback).toHaveBeenCalledOnce();
      expect(handleMdnsErrorCallback).toHaveBeenCalledWith(mockError);
    });
  });

  describe('handleMdnsWarning()', () => {
    it('should return a function', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(discoveryService['handleMdnsWarning'](() => {})).toBeInstanceOf(Function);
    });

    it('should call the callback when invoked with an error', () => {
      const handleMdnsWarningCallback = vi.fn();

      const mockError = new Error('Some warning');

      discoveryService['handleMdnsWarning'](handleMdnsWarningCallback)(mockError);

      expect(handleMdnsWarningCallback).toHaveBeenCalledOnce();
      expect(handleMdnsWarningCallback).toHaveBeenCalledWith(mockError);
    });
  });

  describe('isGoodbyeResponse()', () => {
    it('should return true when invoked with a goodbye response', () => {
      expect(discoveryService['isGoodbyeResponse'](mockMdnsGoodbyeResponse)).toBe(true);
    });

    it('should return false when invoked with a response that is no goodbye response', () => {
      expect(discoveryService['isGoodbyeResponse'](mockMdnsResponse)).toBe(false);
    });
  });

  describe('isHomeWizardEnergyResponse()', () => {
    it('should return true when invoked with a response that includes a homewizard device', () => {
      expect(discoveryService['isHomeWizardEnergyResponse'](mockMdnsResponse)).toBe(true);
    });

    it('should return false when invoked with a response that not includes a homewizard device', () => {
      expect(discoveryService['isHomeWizardEnergyResponse'](mockMdnsResponseChromecast)).toBe(
        false,
      );
    });
  });

  describe('getTxtRecordFromResponse()', () => {
    it('should return the txt record as an object from a mdns response', () => {
      expect(discoveryService['getTxtRecordFromResponse'](mockMdnsResponse)).toMatchObject({
        api_enabled: '1',
        path: '/api/v1',
        product_name: 'Energy Socket',
        product_type: 'HWE-SKT',
        serial: '3c39e727ff1e',
      });
    });

    it('should return null from a mdns response when there is no TXT answer', () => {
      const mockMdnsResponseWithoutTxtRecord = {
        ...mockMdnsResponse,
        answers: mockMdnsResponse.answers.filter(answer => answer.type !== 'TXT'),
      };

      expect(
        discoveryService['getTxtRecordFromResponse'](mockMdnsResponseWithoutTxtRecord),
      ).toBeNull();
    });

    it('should return null from a mdns response when the TXT answer misses the data property', () => {
      const mockMdnsResponseWithoutDataProp = {
        ...mockMdnsResponse,
        answers: mockMdnsResponse.answers.map(answer => {
          if (answer.type === 'TXT') {
            return {
              ...answer,
              data: undefined,
            } as unknown as multicastDns.ResponsePacket['answers'][number];
          }
          return answer;
        }),
      };

      expect(
        discoveryService['getTxtRecordFromResponse'](mockMdnsResponseWithoutDataProp),
      ).toBeNull();
    });

    it('should return null from a mdns response when the TXT answer has no buffers array in the data property', () => {
      const mockMdnsResponseWithoutBufferArray = {
        ...mockMdnsResponse,
        answers: mockMdnsResponse.answers.map(answer => {
          if (answer.type === 'TXT') {
            return {
              ...answer,
              data: ['string', 'array', 'is', 'not', 'a', 'buffer', 'array'],
            } as unknown as multicastDns.ResponsePacket['answers'][number];
          }
          return answer;
        }),
      };

      expect(
        discoveryService['getTxtRecordFromResponse'](mockMdnsResponseWithoutBufferArray),
      ).toBeNull();
    });
  });

  describe('getHostDetailsFromAnswer()', () => {
    it('should return the host details as an object from a mdns response', () => {
      const additional = mockMdnsResponse.additionals.find(additional => additional.type === 'A');

      if (!additional) throw new Error('No additional found!');

      const expected = {
        hostname: 'energysocket-27FF1E.local',
        ip: '192.168.1.34',
      };

      expect(discoveryService['getHostDetailsFromAnswer'](additional)).toMatchObject(expected);
    });
  });

  describe('getHostDetailsFromResponse()', () => {
    it('should return the host details as an object from a mdns response', () => {
      const expected = {
        hostname: 'energysocket-27FF1E.local',
        ip: '192.168.1.34',
      };

      expect(discoveryService['getHostDetailsFromResponse'](mockMdnsResponse)).toMatchObject(
        expected,
      );
    });
    it('should return the host details as an object from a mdns response', () => {
      const expected = {
        hostname: 'energysocket-27FF1E.local',
        ip: '192.168.1.34',
      };

      expect(discoveryService['getHostDetailsFromResponse'](mockMdnsResponse)).toMatchObject(
        expected,
      );
    });
  });

  describe('getFqdnFromResponse()', () => {
    it('should return the fqdn from a mdns response', () => {
      const expected = 'energysocket-27FF1E._hwenergy._tcp.local';
      expect(discoveryService['getFqdnFromResponse'](mockMdnsResponse)).toBe(expected);
    });

    // TODO: rename
    it('should return the fqdn from a mdns response', () => {
      const expected = null;

      const test = {
        ...mockMdnsResponse,
        answers: [],
      };
      expect(discoveryService['getFqdnFromResponse'](test)).toBe(expected);
    });

    // TODO: rename
    it('should return null when the data property in answer is missing', () => {
      const expected = null;

      const mockedMdnsResponseWithoutData = {
        ...mockMdnsResponse,
        answers: [
          {
            name: '_hwenergy._tcp.local',
            type: 'PTR',
            ttl: 4500,
            class: 'IN',
            flush: false,
            // data: 'energysocket-27FF1E._hwenergy._tcp.local',
          },
        ],
      } as multicastDns.ResponsePacket;
      expect(discoveryService['getFqdnFromResponse'](mockedMdnsResponseWithoutData)).toBe(expected);
    });
    it('should return null if the data property in answer is not a string', () => {
      const expected = null;

      const mockedMdnsResponseWithoutDataString = {
        ...mockMdnsResponse,
        answers: [
          {
            name: '_hwenergy._tcp.local',
            type: 'PTR',
            ttl: 4500,
            class: 'IN',
            flush: false,
            data: false as unknown as string, // test
          },
        ],
      } as multicastDns.ResponsePacket;
      expect(discoveryService['getFqdnFromResponse'](mockedMdnsResponseWithoutDataString)).toBe(
        expected,
      );
    });
  });

  describe('getCachedResponseByFqdn', () => {
    it('should return the cached response by fqdn', () => {
      discoveryService['cachedDiscoveryResponses'] = [mockDiscoveryResponse];

      const mockFqdn = 'energysocket-27FF1E._hwenergy._tcp.local';

      expect(discoveryService['getCachedResponseByFqdn'](mockFqdn)).toBe(mockDiscoveryResponse);
    });

    it('should return undefined if no cached response is found', () => {
      discoveryService['cachedDiscoveryResponses'] = [];

      const mockFqdn = 'energysocket-27FF1E._hwenergy._tcp.local';

      expect(discoveryService['getCachedResponseByFqdn'](mockFqdn)).toBeUndefined();
    });
  });

  describe('removeCachedResponseByFqdn', () => {
    it('should remove the cached response by fqdn', () => {
      discoveryService['cachedDiscoveryResponses'] = [mockDiscoveryResponse];

      discoveryService['removeCachedResponseByFqdn'](mockDiscoveryResponse.fqdn);

      expect(discoveryService['cachedDiscoveryResponses']).not.toContain(mockDiscoveryResponse);
    });
  });

  describe('isDiscoveryResponseInCache', () => {
    it('should return true if the discovery response is in the cache', () => {
      discoveryService['cachedDiscoveryResponses'] = [mockDiscoveryResponse];

      expect(discoveryService['isDiscoveryResponseInCache'](mockDiscoveryResponse)).toBe(true);
    });

    it('should return false if the discovery response is not in the cache', () => {
      discoveryService['cachedDiscoveryResponses'] = [];

      expect(discoveryService['isDiscoveryResponseInCache'](mockDiscoveryResponse)).toBe(false);
    });
  });

  // TODO: test on response and error/warning

  describe('API v2 (types option)', () => {
    const v2TxtData = [
      'api_version=2.0.0',
      'id=appliance/battery/5c2fafaabbcc',
      'serial=5c2fafaabbcc',
      'product_name=Plug-In Battery',
      'product_type=HWE-BAT',
    ].map(entry => Buffer.from(entry));

    const mockMdnsResponseV2 = {
      ...mockMdnsResponse,
      answers: [
        {
          name: '_homewizard._tcp.local',
          type: 'PTR',
          ttl: 4500,
          class: 'IN',
          flush: false,
          data: 'battery-AABBCC._homewizard._tcp.local',
        },
        {
          name: 'battery-AABBCC._homewizard._tcp.local',
          type: 'TXT',
          ttl: 4500,
          class: 'IN',
          flush: true,
          data: v2TxtData,
        },
        {
          name: 'battery-AABBCC.local',
          type: 'A',
          ttl: 120,
          class: 'IN',
          flush: true,
          data: '192.168.1.50',
        },
      ],
      additionals: [],
    } as unknown as typeof mockMdnsResponse;

    it('should call the callback for each service when a device answers both in one response', () => {
      const callback = vi.fn();
      const v2Discovery = new HomeWizardEnergyDiscovery({ types: ['hwenergy', 'homewizard'] });
      const v1Txt = ['api_enabled=1', 'path=/api/v1', 'serial=5c2fafaabbcc', 'product_type=HWE-P1'];
      const v2Txt = [
        'api_version=2.3.0',
        'id=appliance/p1dongle/5c2fafaabbcc',
        'product_type=HWE-P1',
      ];

      const combined = {
        ...mockMdnsResponse,
        answers: [
          {
            name: '_hwenergy._tcp.local',
            type: 'PTR',
            ttl: 4500,
            data: 'p1-AABBCC._hwenergy._tcp.local',
          },
          {
            name: '_homewizard._tcp.local',
            type: 'PTR',
            ttl: 4500,
            data: 'p1-AABBCC._homewizard._tcp.local',
          },
        ],
        // txt and host records in the additionals, the txt of the API v2 first
        additionals: [
          {
            name: 'p1-AABBCC._homewizard._tcp.local',
            type: 'TXT',
            data: v2Txt.map(t => Buffer.from(t)),
          },
          {
            name: 'p1-AABBCC._hwenergy._tcp.local',
            type: 'TXT',
            data: v1Txt.map(t => Buffer.from(t)),
          },
          { name: 'p1-AABBCC.local', type: 'A', ttl: 120, data: '192.168.1.60' },
        ],
      } as unknown as typeof mockMdnsResponse;

      v2Discovery['handleMdnsResponse'](callback)(combined);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[0][0].fqdn).toBe('p1-AABBCC._hwenergy._tcp.local');
      expect(callback.mock.calls[0][0].txt.api_enabled).toBe('1');
      expect(isMdnsTxtRecordV2(callback.mock.calls[0][0].txt)).toBe(false);
      expect(callback.mock.calls[1][0].fqdn).toBe('p1-AABBCC._homewizard._tcp.local');
      expect(callback.mock.calls[1][0].txt.api_version).toBe('2.3.0');
      expect(callback.mock.calls[1][0].ip).toBe('192.168.1.60');
    });

    it('should ignore an incomplete response without throwing', () => {
      const callback = vi.fn();
      const v2Discovery = new HomeWizardEnergyDiscovery({ types: ['hwenergy', 'homewizard'] });

      // no A record (ip) and no txt record
      const incomplete = {
        ...mockMdnsResponse,
        answers: [
          {
            name: '_homewizard._tcp.local',
            type: 'PTR',
            ttl: 4500,
            data: 'p1-AABBCC._homewizard._tcp.local',
          },
        ],
        additionals: [],
      } as unknown as typeof mockMdnsResponse;

      expect(() => v2Discovery['handleMdnsResponse'](callback)(incomplete)).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should remove only the service of the goodbye from the cache', () => {
      const callback = vi.fn();
      const v2Discovery = new HomeWizardEnergyDiscovery({ types: ['hwenergy', 'homewizard'] });

      v2Discovery['handleMdnsResponse'](callback)(mockMdnsResponseV2);
      expect(v2Discovery['cachedDiscoveryResponses']).toHaveLength(1);

      const goodbye = {
        ...mockMdnsResponseV2,
        answers: [{ ...mockMdnsResponseV2.answers[0], ttl: 0 }],
      } as unknown as typeof mockMdnsResponse;

      v2Discovery['handleMdnsResponse'](callback)(goodbye);

      expect(v2Discovery['cachedDiscoveryResponses']).toHaveLength(0);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should only query the API v1 domain by default', () => {
      querySpy.mockClear();
      new HomeWizardEnergyDiscovery().start();

      expect(querySpy).toHaveBeenCalledWith('_hwenergy._tcp.local', 'PTR');
    });

    it('should query all the given types when start() is invoked', () => {
      querySpy.mockClear();
      new HomeWizardEnergyDiscovery({ types: ['hwenergy', 'homewizard'] }).start();

      expect(querySpy).toHaveBeenCalledWith([
        { name: '_hwenergy._tcp.local', type: 'PTR' },
        { name: '_homewizard._tcp.local', type: 'PTR' },
      ]);
    });

    it('should ignore API v2 responses by default', () => {
      const callback = vi.fn();

      new HomeWizardEnergyDiscovery()['handleMdnsResponse'](callback)(mockMdnsResponseV2);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should call the callback with the API v2 txt record', () => {
      const callback = vi.fn();
      const v2Discovery = new HomeWizardEnergyDiscovery({ types: ['hwenergy', 'homewizard'] });

      v2Discovery['handleMdnsResponse'](callback)(mockMdnsResponseV2);
      v2Discovery['handleMdnsResponse'](callback)(mockMdnsResponse);

      expect(callback).toHaveBeenCalledTimes(2);

      const v2Response = callback.mock.calls[0][0];

      expect(v2Response).toStrictEqual({
        ip: '192.168.1.50',
        hostname: 'battery-AABBCC.local',
        fqdn: 'battery-AABBCC._homewizard._tcp.local',
        txt: {
          api_version: '2.0.0',
          id: 'appliance/battery/5c2fafaabbcc',
          serial: '5c2fafaabbcc',
          product_name: 'Plug-In Battery',
          product_type: 'HWE-BAT',
        },
      });
      expect(isMdnsTxtRecordV2(v2Response.txt)).toBe(true);
      expect(isMdnsTxtRecordV2(callback.mock.calls[1][0].txt)).toBe(false);
    });
  });
});
