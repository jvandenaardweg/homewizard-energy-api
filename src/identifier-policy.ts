import type { Dispatcher } from 'undici';
import { HomeWizardError } from './errors';
import { createCheckServerIdentity, HOMEWIZARD_CA_CERT } from './tls';

/**
 * How a connection treats the identifier in the device's certificate. It's decided once, from the credentials and
 * the options, before the client connects:
 *
 * - `pinned`: the certificate must be signed by the CA and issued to the identifier. The device classes, and
 *   `pair()` with the `identifier` option.
 * - `learn`: any certificate the CA signed is accepted, and its Common Name is kept, so `pair()` can return it.
 *   Only `pair()` without an identifier.
 * - `insecure`: no checks. A given identifier is only passed on.
 *
 * @internal
 */
export class IdentifierPolicy {
  /** The Common Names of the certificates that passed the check, while learning. */
  private readonly seen = new Set<string>();

  private constructor(
    readonly mode: 'pinned' | 'learn' | 'insecure',
    private readonly expected?: string,
  ) {}

  /** For the device classes: the stored identifier is required, unless `insecure`. */
  static forDevice(identifier: string | undefined, insecure?: boolean): IdentifierPolicy {
    if (insecure) return new IdentifierPolicy('insecure', identifier || undefined);

    if (!identifier) {
      throw new HomeWizardError(
        'invalid',
        'The "identifier" of the credentials is required to check the certificate of the device. Use the identifier that pair() returned, or getCertificateIdentifier() with the serial on the device label. Set "insecure: true" to skip the check.',
      );
    }

    return new IdentifierPolicy('pinned', identifier);
  }

  /**
   * For `pair()`: like a device with an identifier or `insecure`, and otherwise learns the identifier from the
   * certificate. Your own dispatcher doesn't run the certificate check, so it can't learn: that's refused here,
   * before the token is created, because a token without an identifier can't be used.
   */
  static forPairing(
    identifier: string | undefined,
    { insecure, dispatcher }: { insecure?: boolean; dispatcher?: Dispatcher },
  ): IdentifierPolicy {
    if (identifier || insecure) return IdentifierPolicy.forDevice(identifier, insecure);

    if (dispatcher) {
      throw new HomeWizardError(
        'invalid',
        'Pairing with your own "dispatcher" can\'t read the identifier from the certificate. Pass the "identifier" option, or set "insecure: true".',
      );
    }

    return new IdentifierPolicy('learn');
  }

  /** The TLS options for the HTTPS requests and the WebSocket. */
  tlsOptions(ca?: string) {
    if (this.mode === 'insecure') {
      return { rejectUnauthorized: false, checkServerIdentity: () => undefined };
    }

    return {
      ca: ca ?? HOMEWIZARD_CA_CERT,
      rejectUnauthorized: true,
      checkServerIdentity:
        this.mode === 'learn'
          ? createCheckServerIdentity(undefined, commonName => this.seen.add(commonName))
          : createCheckServerIdentity(this.expected),
    };
  }

  /**
   * Returns the identifier of the device: the given one, or the one learned from the certificate. `undefined` when
   * insecure without one, because the certificate isn't checked. Throws when learning saw no certificate, or the
   * certificates of different devices.
   */
  identifier(): string | undefined {
    if (this.mode !== 'learn') return this.expected;

    if (this.seen.size > 1) {
      throw new HomeWizardError(
        'certificate',
        `Different devices answered at this address during pairing (${[...this.seen].join(', ')}), so the token can't be trusted`,
      );
    }

    const [identifier] = this.seen;

    if (!identifier) {
      throw new HomeWizardError(
        'certificate',
        'The identifier of the device could not be read from its certificate. Pass the "identifier" option, built with getCertificateIdentifier() from the serial on the device label.',
      );
    }

    return identifier;
  }
}
