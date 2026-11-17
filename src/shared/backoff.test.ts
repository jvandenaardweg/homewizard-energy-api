import { Backoff } from './backoff';

describe('shared/Backoff', () => {
  it('should double the delay each time, up to the maximum', () => {
    const backoff = new Backoff(1000, 5000);

    expect([backoff.next(), backoff.next(), backoff.next(), backoff.next()]).toStrictEqual([
      1000, 2000, 4000, 5000,
    ]);
  });

  it('should keep doubling without a maximum', () => {
    const backoff = new Backoff(500);

    expect([backoff.next(), backoff.next(), backoff.next()]).toStrictEqual([500, 1000, 2000]);
  });

  it('should start again at the first delay after a reset', () => {
    const backoff = new Backoff(1000);
    backoff.next();
    backoff.next();

    backoff.reset();

    expect(backoff.next()).toBe(1000);
  });
});
