import * as v1 from '.';

/*
 * The runtime exports of the /v1 entry point. Like the other entry points in src/index.test.ts, a change to this
 * list is a change to the public API, so it has to be on purpose.
 */
describe('entry point', () => {
  it('should export exactly the frozen API v1 from /v1', () => {
    expect(Object.keys(v1).sort()).toStrictEqual([
      'BaseApi',
      'DEFAULT_API_VERSION',
      'DEFAULT_BODY_TIMEOUT',
      'DEFAULT_HEADERS_TIMEOUT',
      'DEFAULT_TIMEOUT',
      'EnergySocketApi',
      'ErrorCodes',
      'HomeWizardEnergyApiError',
      'HomeWizardEnergyApiResponseError',
      'HomeWizardEnergyApiTimeoutError',
      'HomeWizardEnergyDiscovery',
      'KwhMeter1PhaseApi',
      'KwhMeter3PhaseApi',
      'MDNS_DISCOVERY_DOMAIN',
      'MDNS_DISCOVERY_PROTOCOL',
      'MDNS_DISCOVERY_QUERY_TYPE',
      'MDNS_DISCOVERY_TYPE',
      'P1MeterApi',
      'SupportedDevicesList',
      'WaterMeterApi',
    ]);
  });
});
