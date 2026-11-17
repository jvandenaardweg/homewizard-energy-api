import { PeerCertificate } from 'tls';
import {
  CERTIFICATE_IDENTITY_ERROR_CODE,
  createCheckServerIdentity,
  getCertificateIdentifier,
  getCommonName,
  HOMEWIZARD_CA_CERT,
  isCertificateError,
} from './tls';

const certificate = (CN?: string | string[]) => ({ subject: { CN } }) as unknown as PeerCertificate;

describe('v2/tls', () => {
  it('should hold the HomeWizard CA certificate', () => {
    expect(HOMEWIZARD_CA_CERT).toMatch(/^-----BEGIN CERTIFICATE-----\n/);
    expect(HOMEWIZARD_CA_CERT).toMatch(/-----END CERTIFICATE-----\n$/);
  });

  describe('getCertificateIdentifier', () => {
    it('should use the certificate product type of each device', () => {
      expect(getCertificateIdentifier('HWE-P1', '5c2fafaabbcc')).toBe(
        'appliance/p1dongle/5c2fafaabbcc',
      );
      expect(getCertificateIdentifier('HWE-KWH1', 'aa')).toBe('appliance/energymeter/aa');
      expect(getCertificateIdentifier('HWE-KWH3', 'aa')).toBe('appliance/energymeter/aa');
      expect(getCertificateIdentifier('SDM230-wifi', 'aa')).toBe('appliance/energymeter/aa');
      expect(getCertificateIdentifier('SDM630-wifi', 'aa')).toBe('appliance/energymeter/aa');
      expect(getCertificateIdentifier('HWE-BAT', 'aa')).toBe('appliance/battery/aa');
    });

    it('should lowercase the serial', () => {
      expect(getCertificateIdentifier('HWE-P1', '5C2FAFAABBCC')).toBe(
        'appliance/p1dongle/5c2fafaabbcc',
      );
    });

    it('should return undefined for a product type without the API v2', () => {
      expect(getCertificateIdentifier('HWE-SKT', 'aa')).toBeUndefined();
    });
  });

  describe('getCommonName', () => {
    it('should return the Common Name, or the first of several', () => {
      expect(getCommonName(certificate('a'))).toBe('a');
      expect(getCommonName(certificate(['a', 'b']))).toBe('a');
      expect(getCommonName(certificate())).toBeUndefined();
    });
  });

  describe('createCheckServerIdentity', () => {
    it('should accept a matching Common Name and report it', () => {
      const onCertificate = vi.fn();
      const check = createCheckServerIdentity('appliance/p1dongle/aa', onCertificate);

      expect(check('192.168.1.35', certificate('appliance/p1dongle/aa'))).toBeUndefined();
      expect(onCertificate).toHaveBeenCalledWith('appliance/p1dongle/aa');
    });

    it('should not build an identifier for a property of Object', () => {
      expect(getCertificateIdentifier('constructor', '5c2fafaabbcc')).toBeUndefined();
      expect(getCertificateIdentifier('toString', '5c2fafaabbcc')).toBeUndefined();
    });

    it('should accept the identifier in another case, as typed from the device label', () => {
      const check = createCheckServerIdentity('appliance/p1dongle/5C2FAFAABBCC');

      expect(check('192.168.1.35', certificate('appliance/p1dongle/5c2fafaabbcc'))).toBeUndefined();
    });

    it('should reject a different Common Name', () => {
      const onCertificate = vi.fn();
      const error = createCheckServerIdentity('appliance/p1dongle/aa', onCertificate)(
        '192.168.1.35',
        certificate('appliance/p1dongle/bb'),
      );

      expect(error?.message).toBe(
        'The certificate of the device is issued to "appliance/p1dongle/bb", but "appliance/p1dongle/aa" was expected',
      );
      expect(error).toHaveProperty('code', CERTIFICATE_IDENTITY_ERROR_CODE);
      expect(onCertificate).not.toHaveBeenCalled();
    });

    it('should reject a certificate without a Common Name', () => {
      const error = createCheckServerIdentity()('192.168.1.35', certificate());

      expect(error?.message).toBe('The certificate of the device has no Common Name');
    });

    it('should accept any Common Name without an identifier', () => {
      expect(createCheckServerIdentity()('192.168.1.35', certificate('x'))).toBeUndefined();
    });
  });

  describe('isCertificateError', () => {
    it('should recognise certificate errors by their code', () => {
      expect(isCertificateError({ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' })).toBe(true);
      expect(isCertificateError({ code: 'SELF_SIGNED_CERT_IN_CHAIN' })).toBe(true);
      expect(isCertificateError({ code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' })).toBe(true);
      expect(isCertificateError({ code: CERTIFICATE_IDENTITY_ERROR_CODE })).toBe(true);
    });

    it('should not treat other errors as certificate errors', () => {
      expect(isCertificateError({ code: 'ECONNREFUSED' })).toBe(false);
      expect(isCertificateError({ code: 1 })).toBe(false);
      expect(isCertificateError(new Error('x'))).toBe(false);
      expect(isCertificateError(null)).toBe(false);
    });
  });
});
