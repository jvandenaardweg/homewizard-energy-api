import { isApiVersionAtLeast, isNewerApiVersion } from './api-version';

describe('api-version', () => {
  it('should tell whether a version is newer', () => {
    expect(isNewerApiVersion('2.4.0', '2.3.0')).toBe(true);
    expect(isNewerApiVersion('2.3.1', '2.3.0')).toBe(true);
    expect(isNewerApiVersion('3', '2.3.0')).toBe(true);
    expect(isNewerApiVersion('2.10.0', '2.9.0')).toBe(true);
    expect(isNewerApiVersion('2.3.0.1', '2.3.0')).toBe(true);
    expect(isNewerApiVersion('2.3.0', '2.3.0')).toBe(false);
    expect(isNewerApiVersion('2.3', '2.3.0')).toBe(false);
    expect(isNewerApiVersion('2.2.0', '2.3.0')).toBe(false);
    expect(isNewerApiVersion('v2', '2.3.0')).toBe(false);
  });

  it('should tell whether a version is at least the minimum', () => {
    expect(isApiVersionAtLeast('2.3.0', '2.3.0')).toBe(true);
    expect(isApiVersionAtLeast('2.3', '2.3.0')).toBe(true);
    expect(isApiVersionAtLeast('2.10.0', '2.3.0')).toBe(true);
    expect(isApiVersionAtLeast('3.0.0', '2.3.0')).toBe(true);
    expect(isApiVersionAtLeast('2.2.0', '2.3.0')).toBe(false);
    expect(isApiVersionAtLeast('v1', '2.0.0')).toBe(false);
  });
});
