import { HomeWizardEnergyApi } from './api';
import { MDNS_DISCOVERY_DOMAIN } from './types';

let homeWizardEnergyApi: HomeWizardEnergyApi;

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

describe('HomeWizardEnergyApi', () => {
  beforeEach(() => {
    homeWizardEnergyApi = new HomeWizardEnergyApi();
  });

  it('should create a new instance', () => {
    expect(homeWizardEnergyApi).toBeTruthy();
  });

  it('should expose discovery', () => {
    expect(homeWizardEnergyApi.discovery).toBeTruthy();
  });

  it('should expose discovery.start', () => {
    expect(homeWizardEnergyApi.discovery.start).toBeTruthy();
  });
  it('should expose discovery.stop', () => {
    expect(homeWizardEnergyApi.discovery.stop).toBeTruthy();
  });
  it('should expose discovery.on', () => {
    expect(homeWizardEnergyApi.discovery.on).toBeTruthy();
  });

  it('should run mdns.query() when discovery.start() is invoked', () => {
    homeWizardEnergyApi.discovery.start();

    expect(querySpy).toHaveBeenCalledOnce();
    expect(querySpy).toHaveBeenCalledWith(MDNS_DISCOVERY_DOMAIN, 'PTR');
  });

  it('should run mdns.removeAllListeners() and mdns.destroy() when discovery.stop() is invoked', () => {
    homeWizardEnergyApi.discovery.start();
    homeWizardEnergyApi.discovery.stop();

    expect(removeAllListenersSpy).toHaveBeenCalledOnce();
    expect(destroySpy).toHaveBeenCalledOnce();
  });

  it('should trigger the logger invoking a method', async () => {
    const loggerSpy = vi.fn();

    const homeWizardEnergyApiWithLogger = new HomeWizardEnergyApi({
      logger: loggerSpy,
    });

    homeWizardEnergyApiWithLogger.discovery.start();

    expect(loggerSpy).toHaveBeenCalled();
  });

  // TODO: test on response and error/warning
});
