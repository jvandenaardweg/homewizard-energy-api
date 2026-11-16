import { readFileSync } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import { createServer } from 'https';
import { AddressInfo } from 'net';
import { Duplex } from 'stream';
import { join } from 'path';

/*
 * A local HTTPS server with a certificate like a device's, for the tests that need a real TLS handshake:
 * MockAgent skips TLS, so it can't test the certificate checks.
 *
 * The CA and the device certificate (CN `appliance/p1dongle/5c2fafaabbcc`) are test-only and valid until 2126.
 * The CA's private key was thrown away after signing.
 */

export const mockTlsCa = readFileSync(join(__dirname, 'ca.pem'), 'utf8');
export const mockTlsIdentifier = 'appliance/p1dongle/5c2fafaabbcc';

export interface MockTlsServer {
  /** The host to connect to, for example `127.0.0.1:54321`. */
  host: string;
  close: () => Promise<void>;
}

export async function startMockTlsServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  onUpgrade?: (request: IncomingMessage, socket: Duplex, head: Buffer) => void,
): Promise<MockTlsServer> {
  const server = createServer(
    {
      key: readFileSync(join(__dirname, 'device.key')),
      cert: readFileSync(join(__dirname, 'device.pem')),
    },
    handler,
  );

  if (onUpgrade) server.on('upgrade', onUpgrade);

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  const { port } = server.address() as AddressInfo;

  return {
    host: `127.0.0.1:${port}`,
    close: () =>
      new Promise<void>(resolve => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
