/**
 * Compares two API versions such as `2.4.0`: negative when `a` is older, `0` when equal, positive when newer.
 * Returns `NaN` when `a` can't be read, which is neither newer nor at least anything.
 */
function compareApiVersions(a: string, b: string): number {
  const parse = (value: string) => value.trim().split('.').map(Number);
  const left = parse(a);
  const right = parse(b);

  if (left.some(Number.isNaN)) return NaN;

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }

  return 0;
}

/**
 * Returns `true` when `version` (such as `2.4.0`) is newer than `than`. A version it can't read counts as not newer.
 */
export function isNewerApiVersion(version: string, than: string): boolean {
  return compareApiVersions(version, than) > 0;
}

/**
 * Returns `true` when the device's API version is `minimum` or newer, for the fields and endpoints that need a
 * newer firmware. A version it can't read counts as too old.
 *
 * @example
 * const { api_version } = await p1.getDevice();
 *
 * if (isApiVersionAtLeast(api_version, '2.3.0')) {
 *   await p1.updateBatteries({ charge_to_full: true });
 * }
 *
 * @link https://api-documentation.homewizard.com/docs/versioning
 */
export function isApiVersionAtLeast(version: string, minimum: string): boolean {
  return compareApiVersions(version, minimum) >= 0;
}
