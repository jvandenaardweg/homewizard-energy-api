import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { MockTlsServer, startMockTlsServer } from './server';

/*
 * A minimal WebSocket server on the mock TLS server, enough to script a device in the tests: the handshake,
 * text frames in both directions and close frames. Client frames are always masked, server frames never.
 */

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export interface MockWebSocketConnection extends EventEmitter {
  /** The parsed JSON messages received so far. */
  received: { type: string; data?: unknown }[];
  send(message: unknown): void;
  sendRaw(text: string): void;
  /** Sends a close frame and ends the connection. */
  close(code?: number): void;
  /** Drops the connection without a close frame. */
  destroy(): void;
}

function encodeFrame(opcode: number, payload: Buffer): Buffer {
  const length = payload.length;
  let header: Buffer;

  if (length < 126) {
    header = Buffer.from([0x80 | opcode, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function createConnection(socket: Duplex): MockWebSocketConnection {
  const connection = new EventEmitter() as MockWebSocketConnection;
  let buffer = Buffer.alloc(0);

  connection.received = [];
  connection.sendRaw = text => socket.write(encodeFrame(0x1, Buffer.from(text)));
  connection.send = message => connection.sendRaw(JSON.stringify(message));
  connection.close = (code = 1000) => {
    const payload = Buffer.alloc(2);
    payload.writeUInt16BE(code);
    socket.end(encodeFrame(0x8, payload));
  };
  connection.destroy = () => socket.destroy();

  socket.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const opcode = buffer[0] & 0x0f;
      let length = buffer[1] & 0x7f;
      let offset = 2;

      if (length === 126) {
        length = buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        length = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      if (buffer.length < offset + 4 + length) return;

      const mask = buffer.subarray(offset, offset + 4);
      const payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length));

      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];

      buffer = buffer.subarray(offset + 4 + length);

      if (opcode === 0x1) {
        const message = JSON.parse(payload.toString());
        connection.received.push(message);
        connection.emit('message', message);
      } else if (opcode === 0x8) {
        socket.end(encodeFrame(0x8, payload));
        connection.emit('close');
      } else if (opcode === 0x9) {
        socket.write(encodeFrame(0xa, payload));
      }
    }
  });

  socket.on('close', () => connection.emit('close'));
  socket.on('error', () => undefined);

  return connection;
}

export interface MockWebSocketServer extends MockTlsServer {
  /** Every connection so far, in order. */
  connections: MockWebSocketConnection[];
}

/**
 * Starts the mock TLS server with a WebSocket at any path. `onConnection` is called for each new connection.
 */
export async function startMockWebSocketServer(
  onConnection: (connection: MockWebSocketConnection, request: IncomingMessage) => void,
): Promise<MockWebSocketServer> {
  const connections: MockWebSocketConnection[] = [];

  const server = await startMockTlsServer(
    (_request, response) => {
      response.statusCode = 404;
      response.end();
    },
    (request, socket) => {
      const key = request.headers['sec-websocket-key'];
      const accept = createHash('sha1').update(`${key}${WEBSOCKET_GUID}`).digest('base64');

      socket.write(
        [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${accept}`,
          '',
          '',
        ].join('\r\n'),
      );

      const connection = createConnection(socket);
      connections.push(connection);
      onConnection(connection, request);
    },
  );

  return { ...server, connections };
}

/** Scripts the authorization of a device: requests the token, and accepts `token`. Anything else is dropped. */
export function authorizeLikeADevice(connection: MockWebSocketConnection, token: string): void {
  connection.send({ type: 'authorization_requested', data: { api_version: '2.2.0' } });

  connection.on('message', message => {
    if (message.type !== 'authorization') return;

    if (message.data === token) {
      connection.send({ type: 'authorized' });
    } else {
      connection.destroy();
    }
  });
}
