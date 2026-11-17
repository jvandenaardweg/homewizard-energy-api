import * as library from '.';
import * as telegram from './telegram';
import * as v1 from './v1';

/*
 * The runtime exports of the three entry points. They are the public API: adding a name here is a feature, and
 * removing or renaming one is a breaking change, so a change to these lists has to be on purpose. The exported
 * types aren't listed, because they don't exist at runtime.
 */
describe('entry points', () => {
  it('should export exactly the API v2 at the root', () => {
    expect(Object.keys(library).sort()).toStrictEqual([
      'HomeWizardError',
      'KwhMeter1Phase',
      'KwhMeter3Phase',
      'P1Meter',
      'PlugInBattery',
      'ProductTypeList',
      'connect',
      'discover',
      'getCertificateIdentifier',
      'isApiVersionAtLeast',
      'isSameIdentifier',
      'pair',
      'poll',
    ]);
  });

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

  it('should export exactly parseTelegram from /telegram', () => {
    expect(Object.keys(telegram)).toStrictEqual(['parseTelegram']);
    expect(
      telegram.parseTelegram('/ISK5\\2M550T-1012\n\n1-0:1.8.1(000001.000*kWh)\n!1F28').power.import
        .t1,
    ).toStrictEqual({
      value: 1,
      unit: 'kWh',
    });
  });
});
