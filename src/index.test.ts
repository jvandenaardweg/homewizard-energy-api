import * as library from '.';
import * as telegram from './telegram';

/*
 * The runtime exports of the root and /telegram entry points, and src/v1/index.test.ts has those of /v1. They are
 * the public API: adding a name here is a feature, and removing or renaming one is a breaking change, so a change
 * to these lists has to be on purpose. The exported types aren't listed, because they don't exist at runtime.
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
      'createFileStore',
      'createMemoryStore',
      'discover',
      'getCertificateIdentifier',
      'isApiVersionAtLeast',
      'isSameIdentifier',
      'pair',
      'poll',
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
