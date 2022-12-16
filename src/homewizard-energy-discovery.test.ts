import { HomeWizardEnergyDiscovery } from '@/homewizard-energy-discovery';
import { MDNS_DISCOVERY_DOMAIN, MDNS_DISCOVERY_QUERY_TYPE } from '@/types';

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

  it('should trigger the logger invoking a method', async () => {
    const loggerSpy = vi.fn();

    const discoveryServiceWithLogger = new HomeWizardEnergyDiscovery({
      logger: loggerSpy,
    });

    discoveryServiceWithLogger.start();

    expect(loggerSpy).toHaveBeenCalled();
  });

  // TODO: test on response and error/warning
});
