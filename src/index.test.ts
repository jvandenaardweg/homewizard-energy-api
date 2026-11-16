import * as library from '.';
import * as telegram from './telegram';
import * as v1 from './v1';

describe('entry points', () => {
  it('should export the API v2 at the root', () => {
    expect(library.P1Meter).toBeTypeOf('function');
    expect(library.KwhMeter1Phase).toBeTypeOf('function');
    expect(library.KwhMeter3Phase).toBeTypeOf('function');
    expect(library.PlugInBattery).toBeTypeOf('function');
    expect(library.pair).toBeTypeOf('function');
    expect(library.Discovery).toBeTypeOf('function');
  });

  it('should export the frozen API v1 from /v1', () => {
    expect(v1.P1MeterApi).toBeTypeOf('function');
    expect(v1.EnergySocketApi).toBeTypeOf('function');
    expect(v1.HomeWizardEnergyDiscovery).toBeTypeOf('function');
  });

  it('should export parseTelegram from /telegram', () => {
    expect(
      telegram.parseTelegram('/ISK5\\2M550T-1012\n\n1-0:1.8.1(000001.000*kWh)\n!1F28').power.import
        .t1,
    ).toStrictEqual({
      value: 1,
      unit: 'kWh',
    });
  });
});
