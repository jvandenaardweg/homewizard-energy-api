import { HomeWizardEnergyDiscovery } from '@/homewizard-energy-discovery';
import { MDNS_DISCOVERY_DOMAIN, MDNS_DISCOVERY_QUERY_TYPE } from '@/types';
import * as multicastDns from 'multicast-dns';
import {
  mockMdnsGoodbyeResponse,
  mockMdnsResponse,
  mockMdnsResponseChromecast,
} from './mocks/mdns';

let discoveryService: HomeWizardEnergyDiscovery;

const querySpy = vi.fn();
const onSpy = vi.fn();
const removeAllListenersSpy = vi.fn();
const destroySpy = vi.fn();

vi.mock('multicast-dns', () => {
  return {
    default: () => {
      return {
        query: querySpy,
        on: onSpy,
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

  // it('should trigger the "discovered" event when a response is received', () => {
  //   const discoveredSpy = vi.fn();

  //   discoveryService.on('discovered', discoveredSpy);

  //   discoveryService.start();

  //   const response = {
  //     answers: [
  //       {
  //         name: 'test',
  //         type: 'A',
  //         ttl: 120,
  //         data: ''
  //       },
  //     ],
  //   };

  //   onSpy.mock.calls[0][1](response);

  //   expect(discoveredSpy).toHaveBeenCalledOnce();
  //   expect(discoveredSpy).toHaveBeenCalledWith(response);
  // });

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
  });

  describe('getFqdnFromResponse()', () => {
    it('should return the fqdn from a mdns response', () => {
      const expected = 'energysocket-27FF1E._hwenergy._tcp.local';
      expect(discoveryService['getFqdnFromResponse'](mockMdnsResponse)).toBe(expected);
    });
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

  // TODO: test on response and error/warning
});
