import { HomeWizardEnergyDiscovery } from '@/homewizard-energy-discovery';
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

  describe('stop() without start()', () => {
    it('should not touch mDNS when it was never started', () => {
      discoveryService.stop();

      expect(removeAllListenersSpy).not.toHaveBeenCalled();
      expect(destroySpy).not.toHaveBeenCalled();
    });
  });

  describe('on()', () => {
    it.each(['response', 'error', 'warning'] as const)(
      'should register a "%s" listener on mDNS',
      event => {
        discoveryService.start();

        discoveryService.on(event as 'response', vi.fn());

        expect(onSpy).toHaveBeenCalledOnce();
        expect(onSpy).toHaveBeenCalledWith(event, expect.any(Function));
      },
    );

    it('should forward mDNS errors and warnings to the callback', () => {
      const errorCallback = vi.fn();
      const warningCallback = vi.fn();
      const error = new Error('mDNS error');
      const warning = new Error('mDNS warning');

      discoveryService.start();
      discoveryService.on('error', errorCallback);
      discoveryService.on('warning', warningCallback);

      onSpy.mock.calls[0][1](error);
      onSpy.mock.calls[1][1](warning);

      expect(errorCallback).toHaveBeenCalledWith(error);
      expect(warningCallback).toHaveBeenCalledWith(warning);
    });

    it('should forward HomeWizard Energy responses to the callback', () => {
      const responseCallback = vi.fn();

      discoveryService.start();
      discoveryService.on('response', responseCallback);

      onSpy.mock.calls[0][1](mockMdnsResponse);

      expect(responseCallback).toHaveBeenCalledWith(mockDiscoveryResponse);
    });
  });

  describe('handleMdnsResponse() edge cases', () => {
    it('should remove a cached device when its goodbye response arrives', () => {
      const callback = vi.fn();
      const handler = discoveryService['handleMdnsResponse'](callback);

      handler(mockMdnsResponse);
      expect(discoveryService['cachedDiscoveryResponses']).toHaveLength(1);

      handler(mockMdnsGoodbyeResponse);
      expect(discoveryService['cachedDiscoveryResponses']).toHaveLength(0);
    });

    it('should call the callback once for a repeated, unchanged response', () => {
      const callback = vi.fn();
      const handler = discoveryService['handleMdnsResponse'](callback);

      handler(mockMdnsResponse);
      handler(mockMdnsResponse);

      expect(callback).toHaveBeenCalledOnce();
    });

    it('should ignore a response without host details instead of throwing', () => {
      const callback = vi.fn();
      const mockMdnsResponseWithoutHost = {
        ...mockMdnsResponse,
        additionals: [],
      };

      expect(() =>
        discoveryService['handleMdnsResponse'](callback)(mockMdnsResponseWithoutHost),
      ).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
      expect(discoveryService['cachedDiscoveryResponses']).toHaveLength(0);
    });

    it('should ignore a response without a txt record instead of throwing', () => {
      const callback = vi.fn();
      const mockMdnsResponseWithoutTxt = {
        ...mockMdnsResponse,
        answers: mockMdnsResponse.answers.filter(answer => answer.type !== 'TXT'),
      };

      expect(() =>
        discoveryService['handleMdnsResponse'](callback)(mockMdnsResponseWithoutTxt),
      ).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
      expect(discoveryService['cachedDiscoveryResponses']).toHaveLength(0);
    });

    it('should leave the cache alone when a goodbye arrives for an uncached device', () => {
      const removeSpy = vi.fn();
      discoveryService['removeCachedResponseByFqdn'] = removeSpy;

      discoveryService['handleMdnsResponse'](vi.fn())(mockMdnsGoodbyeResponse);

      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  describe('record shape edge cases', () => {
    type Answer = multicastDns.ResponsePacket['answers'][number];

    const aRecord = mockMdnsResponse.additionals[0];

    const withoutKey = (record: Answer, key: string): Answer => {
      const copy = { ...record } as Record<string, unknown>;
      delete copy[key];
      return copy as unknown as Answer;
    };

    it('should not treat an answer without a ttl as a goodbye', () => {
      expect(
        discoveryService['isGoodbyeResponse']({
          ...mockMdnsGoodbyeResponse,
          answers: [withoutKey(mockMdnsGoodbyeResponse.answers[0], 'ttl')],
        }),
      ).toBe(false);
    });

    it('should return no txt record when the TXT answer has no data key', () => {
      const answers = mockMdnsResponse.answers.map(answer =>
        answer.type === 'TXT' ? withoutKey(answer, 'data') : answer,
      );

      expect(
        discoveryService['getTxtRecordFromResponse']({ ...mockMdnsResponse, answers }),
      ).toBeNull();
    });

    it('should return no host details for an A record without data', () => {
      expect(discoveryService['getHostDetailsFromAnswer'](withoutKey(aRecord, 'data'))).toBeNull();
    });

    it('should return no host details for an A record whose data is not a string', () => {
      expect(
        discoveryService['getHostDetailsFromAnswer']({
          ...aRecord,
          data: 42,
        } as unknown as Answer),
      ).toBeNull();
    });

    it('should return no host details when no section has an A record', () => {
      expect(
        discoveryService['getHostDetailsFromResponse']({ ...mockMdnsResponse, additionals: [] }),
      ).toBeNull();
    });

    it('should read the host details from the answers when only they have an A record', () => {
      expect(
        discoveryService['getHostDetailsFromResponse']({
          ...mockMdnsResponse,
          answers: [...mockMdnsResponse.answers, aRecord],
          additionals: [],
        }),
      ).toStrictEqual({ ip: '192.168.1.34', hostname: 'energysocket-27FF1E.local' });
    });

    it('should prefer the additionals when both sections have an A record', () => {
      expect(
        discoveryService['getHostDetailsFromResponse']({
          ...mockMdnsResponse,
          answers: [...mockMdnsResponse.answers, { ...aRecord, data: '10.0.0.1' } as Answer],
        }),
      ).toStrictEqual({ ip: '192.168.1.34', hostname: 'energysocket-27FF1E.local' });
    });
  });
});
