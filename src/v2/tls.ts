import { PeerCertificate } from 'tls';
import { ProductType } from './types';

/**
 * The HomeWizard "Appliance Access CA" certificate, which signs the certificates of devices with the API v2.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#certificate
 */
export const HOMEWIZARD_CA_CERT = `-----BEGIN CERTIFICATE-----
MIIDITCCAgkCFDn7cwYLioTM3VxdAygLl/Px9ovFMA0GCSqGSIb3DQEBCwUAME0x
CzAJBgNVBAYTAk5MMQswCQYDVQQIDAJaSDETMBEGA1UECgwKSG9tZVdpemFyZDEc
MBoGA1UEAwwTQXBwbGlhbmNlIEFjY2VzcyBDQTAeFw0yMTEyMTgxOTEyMTJaFw0z
MTEyMTYxOTEyMTJaME0xCzAJBgNVBAYTAk5MMQswCQYDVQQIDAJaSDETMBEGA1UE
CgwKSG9tZVdpemFyZDEcMBoGA1UEAwwTQXBwbGlhbmNlIEFjY2VzcyBDQTCCASIw
DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAPBIvW8NRffqdvzHZY0M32fQHiGm
pJgNGhiaQmpJfRDhT9yihM0S/hYcN8IqnfrMqoCQb/56Ub0+dZizmtfcGsE+Lpm1
K1znkWqSDlpnuTNOb70TrsxBmbFuNOZQEi/xOjzT2j98wT0GSfxz1RVq6lZhDRRz
xoe08+Xo4+ttUGanfOggJi0BXygeFEVBpbctVVJ9EgqeEE9itjcMlcxMe1QN14f8
hCcOnId+9PSsdmyUCLrTB0FVYrbNfbJPk/vMU57fu6swBjWhYBxPx9ZhFy+7WnPR
9BFg4seHNVQIqZNrf1YwBXlmZQIL32SRPaiH/+AVNMrYGXBvncY0Km6ZHIMCAwEA
ATANBgkqhkiG9w0BAQsFAAOCAQEA6ybM8xm0PCXg8Rr/q0v1vPxQy44PmwXTDj0e
r2vW4ZMiEwXZCp0Kk2K16KJYz4iJyfiQk8ikAIMiRSbyXzmyQ7XmL1O4l4d8E1Pg
8EImvcyoBxFhd0Lq7VKriLc8Bw8SXbahPMGT+Y8Yz0uIsLAYVwlkLfgppVPmBaLD
QautcQnI8WxPvCIQf5anyzgAyJC5ac6/CkB+iyPcuWcG3RMYvXnC0QoTlRa5YMlE
FweVDlT2C/MdDyOxiAD/H1EP/eaySnU0zsxyD0yNFRKsQfQ+UJEPd2GS1AGA1lTy
CGdyYj/Gghrusw0hM4rYXQSERWGF0mpEnuJ+7bHDolHu0rzgTQ==
-----END CERTIFICATE-----
`;

/**
 * The product type in a device's certificate, by `product_type`. For legacy reasons it differs from the product type.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#hostname-validation
 */
export const CERTIFICATE_PRODUCT_TYPES: Record<ProductType, string> = {
  'HWE-P1': 'p1dongle',
  'HWE-KWH1': 'energymeter',
  'HWE-KWH3': 'energymeter',
  'SDM230-wifi': 'energymeter',
  'SDM630-wifi': 'energymeter',
  'HWE-BAT': 'battery',
};

/**
 * Returns the identifier a device's certificate is issued to: `appliance/<certificate product type>/<serial>`.
 * It's the same value as the `id` txt record in discovery. Returns `undefined` for an unknown product type.
 *
 * @example
 * getCertificateIdentifier('HWE-P1', '5c2fafaabbcc'); // 'appliance/p1dongle/5c2fafaabbcc'
 */
export function getCertificateIdentifier(productType: string, serial: string): string | undefined {
  const certificateProductType = CERTIFICATE_PRODUCT_TYPES[productType as ProductType];

  if (!certificateProductType) return undefined;

  return `appliance/${certificateProductType}/${serial.toLowerCase()}`;
}

/** The `code` of the error when the certificate isn't issued to the expected identifier. */
export const CERTIFICATE_IDENTITY_ERROR_CODE = 'ERR_HOMEWIZARD_CERTIFICATE_IDENTITY';

/**
 * Returns `true` for a failed certificate check: a certificate not signed by the CA (OpenSSL codes such as
 * `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or `SELF_SIGNED_CERT_IN_CHAIN`), or one issued to another identifier.
 */
export function isCertificateError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;

  return typeof code === 'string' && /CERT|SIGNATURE|ISSUER/.test(code);
}

function createCertificateIdentityError(message: string): Error {
  return Object.assign(new Error(message), { code: CERTIFICATE_IDENTITY_ERROR_CODE });
}

/** Returns the Common Name of a certificate, the first one when there are several. */
export function getCommonName(certificate: Pick<PeerCertificate, 'subject'>): string | undefined {
  const commonName: string | string[] | undefined = certificate?.subject?.CN;

  return Array.isArray(commonName) ? commonName[0] : commonName;
}

/**
 * Creates the `checkServerIdentity` for the TLS connection to a device.
 *
 * A device has no domain name, so its certificate is issued to `appliance/<product type>/<serial>` (the Common
 * Name), and Node's default hostname check would always fail. The certificate chain is checked separately,
 * against `HOMEWIZARD_CA_CERT`.
 *
 * - With `identifier`, the Common Name must match it.
 * - Without, any genuine HomeWizard device is accepted. Only pairing does this, to learn the identifier.
 *
 * `onCertificate` receives the Common Name of each certificate that passes.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#hostname-validation
 */
export function createCheckServerIdentity(
  identifier?: string,
  onCertificate?: (commonName: string) => void,
) {
  return (_hostname: string, certificate: PeerCertificate): Error | undefined => {
    const commonName = getCommonName(certificate);

    if (!commonName) {
      return createCertificateIdentityError('The certificate of the device has no Common Name');
    }

    if (identifier && commonName !== identifier) {
      return createCertificateIdentityError(
        `The certificate of the device is issued to "${commonName}", but "${identifier}" was expected`,
      );
    }

    onCertificate?.(commonName);

    return undefined;
  };
}
