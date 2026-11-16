import { HomeWizardEnergyApiError, HomeWizardEnergyApiTimeoutError } from '@/shared/errors';
import { Client, DeviceOptions } from './client';
import { createUser } from './endpoints';
import { HomeWizardApiV2Error, HomeWizardApiV2PairingError } from './errors';
import { isCertificateError } from './tls';

export const DEFAULT_PAIR_TIMEOUT = 120000;
export const DEFAULT_PAIR_INTERVAL = 2000;

export interface PairOptions extends Omit<DeviceOptions, 'token'> {
  /**
   * The identifier of the device, when you have it, for example from discovery. The certificate must match it.
   * Without it, any genuine HomeWizard device at this address is accepted, and its identifier is returned.
   */
  identifier?: string;
  /** How long to wait for the button press, in milliseconds. Defaults to `120000` (2 minutes). */
  pairTimeout?: number;
  /** The time between attempts in milliseconds. Defaults to `2000`. */
  interval?: number;
  /** Aborts the pairing. */
  signal?: AbortSignal;
  /** Called before each attempt with the time left, for example to show a countdown. */
  onAttempt?: (remainingMs: number) => void;
}

export interface PairResult {
  /** The token for the `token` option. Store it: the device can't return it again. Keep it secret. */
  token: string;
  /** The name of the user, prefixed with `local/`. */
  name: string;
  /** The identifier the device's certificate is issued to. Store it with the token, for the `identifier` option. */
  identifier: string;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);

    signal?.addEventListener('abort', done, { once: true });
  });
}

/**
 * Creates a user on the device and returns its token, once the user presses the button on the device.
 *
 * It keeps sending `POST /api/user` until the device accepts it, the `pairTimeout` passes, or `signal` aborts.
 * After the button press there are 30 seconds to request the token. On the kWh meters, hold the button for 1 to 3
 * seconds.
 *
 * Pairing again with the same name returns a new token, and the old one stops working.
 *
 * @example
 * const { token, identifier } = await v2.pair('192.168.1.35', 'my-app', {
 *   onAttempt: remainingMs => console.log(`Press the button on the device (${remainingMs / 1000}s left)`),
 * });
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#create-user-and-get-token
 */
export async function pair(
  host: string,
  name: string,
  options: PairOptions = {},
): Promise<PairResult> {
  const {
    pairTimeout = DEFAULT_PAIR_TIMEOUT,
    interval = DEFAULT_PAIR_INTERVAL,
    signal,
    onAttempt,
    ...clientOptions
  } = options;

  const seenIdentifiers = new Set<string>();

  const client = new Client(host, {
    ...clientOptions,
    allowMissingIdentifier: true,
    onCertificate: commonName => seenIdentifiers.add(commonName),
  });

  const startedAt = Date.now();

  client.log(`Pairing with ${client.baseUrl}, waiting ${pairTimeout}ms for the button press`);

  try {
    while (true) {
      if (signal?.aborted) {
        throw new HomeWizardApiV2PairingError('Pairing was aborted', 'aborted');
      }

      const remainingMs = pairTimeout - (Date.now() - startedAt);

      if (remainingMs <= 0) {
        throw new HomeWizardApiV2PairingError(
          `The button on the device was not pressed within ${pairTimeout}ms`,
          'timeout',
        );
      }

      onAttempt?.(remainingMs);

      try {
        const user = await createUser(client, name);

        return { ...user, identifier: getIdentifier(options.identifier, seenIdentifiers) };
      } catch (error) {
        const isWaitingForButton =
          error instanceof HomeWizardApiV2Error && error.code === 'user:creation-not-enabled';

        if (!isWaitingForButton && !isRetryable(error)) throw error;

        client.log(
          isWaitingForButton
            ? 'The button is not pressed yet, trying again'
            : `Pairing attempt failed, trying again: ${String(error)}`,
        );
      }

      await wait(interval, signal);
    }
  } finally {
    await client.close();
  }
}

/**
 * Network errors and timeouts can go away (a reboot, bad Wi-Fi), so they are retried until the pair timeout.
 * Errors from the device (an invalid name, no storage), an invalid name and certificate errors won't.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof HomeWizardEnergyApiTimeoutError) return true;
  if (error instanceof HomeWizardEnergyApiError) return false;
  if (isCertificateError(error)) return false;

  return true;
}

/** Returns the given identifier, or the one seen in the certificate. */
export function getIdentifier(expected: string | undefined, seen: Set<string>): string {
  if (expected) return expected;

  if (seen.size > 1) {
    throw new HomeWizardEnergyApiError(
      `Different devices answered at this address during pairing (${[...seen].join(', ')}), so the token can't be trusted`,
    );
  }

  const [identifier] = seen;

  if (!identifier) {
    throw new HomeWizardEnergyApiError(
      'The identifier of the device could not be read from its certificate. Pass the "identifier" option, for example the "id" txt record from discovery.',
    );
  }

  return identifier;
}
