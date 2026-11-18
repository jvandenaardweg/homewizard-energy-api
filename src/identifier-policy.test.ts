import { PeerCertificate } from 'tls';
import { IdentifierPolicy } from './identifier-policy';
import { HOMEWIZARD_CA_CERT } from './tls';

// The rules are tested over TLS, through pair() and the device classes. This covers what a real handshake can't.
describe('v2/IdentifierPolicy', () => {
  it('should refuse to return an identifier when learning saw no certificate', () => {
    const policy = IdentifierPolicy.forPairing(undefined, {});

    expect(policy.mode).toBe('learn');
    expect(() => policy.identifier()).toThrow(
      expect.objectContaining({
        kind: 'certificate',
        message: expect.stringMatching(/could not be read from its certificate/),
      }),
    );
  });

  // A handshake can't show the default CA without a certificate HomeWizard signed
  it('should check the chain against the HomeWizard CA unless given another', () => {
    for (const policy of [
      IdentifierPolicy.forDevice('appliance/p1dongle/aa'),
      IdentifierPolicy.forPairing(undefined, {}),
    ]) {
      expect(policy.tlsOptions()).toMatchObject({
        ca: HOMEWIZARD_CA_CERT,
        rejectUnauthorized: true,
      });
      expect(policy.tlsOptions('pem').ca).toBe('pem');
    }
  });

  it('should accept any Common Name when insecure', () => {
    // Node only asks for the Common Name check after the chain passes, which the test CA never does without "ca"
    const { checkServerIdentity } = IdentifierPolicy.forDevice('', true).tlsOptions();

    expect(checkServerIdentity('127.0.0.1', {} as PeerCertificate)).toBeUndefined();
  });
});
