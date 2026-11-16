import * as library from '.';

describe('index', () => {
  it('should export the API v2 namespace', () => {
    expect(library.v2.P1Meter).toBeTypeOf('function');
    expect(library.v2.pair).toBeTypeOf('function');
    expect(library.v2.Discovery).toBeTypeOf('function');
  });

  it('should export parseTelegram', () => {
    expect(
      library.parseTelegram('/ISK5\\2M550T-1012\n\n1-0:1.8.1(000001.000*kWh)\n!1F28').power.import
        .t1,
    ).toStrictEqual({
      value: 1,
      unit: 'kWh',
    });
  });
});
