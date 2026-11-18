import { readFileSync } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import { createServer } from 'https';
import { AddressInfo } from 'net';
import { Duplex } from 'stream';
import { join } from 'path';
import { mockV2Identifier } from '../data/v2';

/*
 * A local HTTPS server with a certificate like a device's, for the tests that need a real TLS handshake:
 * MockAgent skips TLS, so it can't test the certificate checks.
 *
 * The CA and the two device certificates (CN `appliance/p1dongle/5c2fafaabbcc` and
 * `appliance/energymeter/5c2fafaabbdd`) are test-only and valid until 2126. The CA's private key was thrown away
 * after signing.
 */

export const mockTlsCa = readFileSync(join(__dirname, 'ca.pem'), 'utf8');
/** The identifier the test device certificate is issued to: the same as the API v2 fixtures. */
export const mockTlsIdentifier = mockV2Identifier;
/** The identifier of the other test device, which `useOtherDevice()` switches to. */
export const mockTlsOtherIdentifier = 'appliance/energymeter/5c2fafaabbdd';

const readCertificate = (name: string) => ({
  key: readFileSync(join(__dirname, `${name}.key`)),
  cert: readFileSync(join(__dirname, `${name}.pem`)),
});

export interface MockTlsServer {
  /** The host to connect to, for example `127.0.0.1:54321`. */
  host: string;
  /** Answers new connections with the certificate of the other device, as if another device took the address. */
  useOtherDevice: () => void;
  close: () => Promise<void>;
}

export async function startMockTlsServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  onUpgrade?: (request: IncomingMessage, socket: Duplex, head: Buffer) => void,
): Promise<MockTlsServer> {
  const server = createServer(readCertificate('device'), handler);

  if (onUpgrade) server.on('upgrade', onUpgrade);

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  const { port } = server.address() as AddressInfo;

  return {
    host: `127.0.0.1:${port}`,
    useOtherDevice: () => server.setSecureContext(readCertificate('other-device')),
    close: () =>
      new Promise<void>(resolve => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
