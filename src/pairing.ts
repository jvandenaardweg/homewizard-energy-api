import { formatError } from '@/shared/errors';
import { wait } from '@/shared/wait';
import { Client, Credentials, DeviceOptions } from './client';
import { createUser, getDevice } from './endpoints';
import { HomeWizardError, isTransientError } from './errors';
import { getCertificateIdentifier } from './tls';
import { UserCreated } from './types';

export const DEFAULT_PAIR_TIMEOUT = 120000;
export const DEFAULT_PAIR_INTERVAL = 2000;

export interface PairOptions extends DeviceOptions {
  /**
   * The identifier of the device, when you have it, for example from an earlier pairing or built with
   * `getCertificateIdentifier()` from the serial on the label. Not from discovery: anyone on the network can announce
   * a device. The certificate must match it. Without it, any genuine HomeWizard device at this address is accepted,
   * and its identifier is returned.
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

/**
 * The credentials of the new user: pass them to the device classes. Store them, because the device can't return
 * the token again. Keep the token secret.
 */
export interface PairResult extends Required<Credentials> {
  /**
   * The identifier the device's certificate is issued to. With `insecure`, it's empty for a product type whose
   * identifier isn't known.
   */
  identifier: string;
}

/**
 * Splits the options that only pairing uses from the device options, which pairing and the device after it share.
 */
export function splitPairOptions(options: PairOptions) {
  const { pairTimeout, interval, signal, onAttempt, identifier, ...deviceOptions } = options;

  return {
    pairTimeout,
    interval,
    signal,
    onAttempt,
    identifier,
    deviceOptions: deviceOptions as DeviceOptions,
  };
}

/**
 * Creates a user on the device and returns its credentials, once the user presses the button on the device.
 *
 * It keeps sending `POST /api/user` until the device accepts it, the `pairTimeout` passes, or `signal` aborts.
 * After the button press there are 30 seconds to request the token. On the kWh meters, hold the button for 1 to 3
 * seconds.
 *
 * Pairing again with the same name returns a new token, and the old one stops working.
 *
 * @example
 * const credentials = await pair('192.168.1.35', 'my-app', {
 *   onAttempt: remainingMs => console.log(`Press the button on the device (${remainingMs / 1000}s left)`),
 * });
 * const p1 = new P1Meter(credentials);
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
    identifier,
    deviceOptions,
  } = splitPairOptions(options);

  // Checked before the token is created: a token without an identifier can't be used, and the button would need
  // another press. Your own dispatcher doesn't run the certificate check that learns the identifier.
  if (deviceOptions.dispatcher && !identifier && !deviceOptions.insecure) {
    throw new HomeWizardError(
      'invalid',
      'Pairing with your own "dispatcher" can\'t read the identifier from the certificate. Pass the "identifier" option, or set "insecure: true".',
    );
  }

  const seenIdentifiers = new Set<string>();

  // createUser() is a POST, which the client never retries: pair() retries it until the pair timeout. The GET for
  // the device information after an insecure pairing does get the client's retries, so a Wi-Fi blip there doesn't
  // lose the new token.
  const client = new Client(host, {
    ...deviceOptions,
    identifier,
    allowMissingIdentifier: true,
    onCertificate: commonName => seenIdentifiers.add(commonName),
  });

  const startedAt = Date.now();
  const timeLeft = () => pairTimeout - (Date.now() - startedAt);

  client.log(`Pairing with ${client.baseUrl}, waiting ${pairTimeout}ms for the button press`);

  try {
    while (true) {
      if (signal?.aborted) {
        throw new HomeWizardError('pairing', 'Pairing was aborted', { reason: 'aborted' });
      }

      const remainingMs = timeLeft();

      if (remainingMs <= 0) {
        throw new HomeWizardError(
          'pairing',
          `The button on the device was not pressed within ${pairTimeout}ms`,
          { reason: 'timeout' },
        );
      }

      onAttempt?.(remainingMs);

      let user: UserCreated;

      try {
        user = await createUser(client, name);
      } catch (error) {
        const isWaitingForButton =
          error instanceof HomeWizardError && error.code === 'user:creation-not-enabled';

        if (!isWaitingForButton && !isRetryable(error)) throw error;

        client.log(
          isWaitingForButton
            ? 'The button is not pressed yet, trying again'
            : `Pairing attempt failed, trying again: ${formatError(error)}`,
        );

        // Don't wait past the pair timeout
        await wait(Math.max(0, Math.min(interval, timeLeft())), signal);
        continue;
      }

      client.log(`Paired as ${user.name}`);

      return {
        host,
        token: user.token,
        identifier: await learnIdentifier(client, user, seenIdentifiers),
      };
    }
  } finally {
    await client.close();
  }
}

/**
 * Returns the identifier: the given one, or the one in the certificate. With `insecure`, the certificate isn't
 * checked, so it's built from the product type and serial in `GET /api` instead, and is empty for a product type
 * whose identifier isn't known. It doesn't throw for that, because the token would be lost.
 */
async function learnIdentifier(
  client: Client,
  user: UserCreated,
  seen: Set<string>,
): Promise<string> {
  const { identifier, insecure } = client.options;

  if (identifier || !insecure) {
    return getIdentifier(identifier, seen);
  }

  client.token = user.token;

  const device = await getDevice(client);
  const built = getCertificateIdentifier(device.product_type, device.serial);

  if (!built) {
    client.log(`The identifier of a "${device.product_type}" is not known, so it stays empty`);
  }

  return built ?? '';
}

/**
 * Network errors and timeouts can go away (a reboot, bad Wi-Fi), so they are retried until the pair timeout.
 * Errors from the device (an invalid name, no storage), an invalid name and certificate errors won't.
 */
export function isRetryable(error: unknown): boolean {
  return !(error instanceof HomeWizardError) || isTransientError(error);
}

/** Returns the given identifier, or the one seen in the certificate. */
export function getIdentifier(expected: string | undefined, seen: Set<string>): string {
  if (expected) return expected;

  if (seen.size > 1) {
    throw new HomeWizardError(
      'certificate',
      `Different devices answered at this address during pairing (${[...seen].join(', ')}), so the token can't be trusted`,
    );
  }

  const [identifier] = seen;

  if (!identifier) {
    throw new HomeWizardError(
      'certificate',
      'The identifier of the device could not be read from its certificate. Pass the "identifier" option, built with getCertificateIdentifier() from the serial on the device label.',
    );
  }

  return identifier;
}
