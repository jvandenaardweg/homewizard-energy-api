/*
 * The WebSocket of a device, in three parts:
 *
 * - `Connection` is one connection, from opening it to its close: the authorization, and the heartbeat that
 *   watches it for silence. It reports why it closed.
 * - `DeviceSocket` is what users get: events, subscriptions, commands and streams. It opens a `Connection` for each
 *   (re)connect, and decides when to reconnect and when to give up.
 * - `types.ts` has the topics and options.
 */
export { DeviceSocket, IdentifiableDeviceSocket } from './device-socket';
export type {
  BatteriesTopic,
  CommonTopics,
  Message,
  SocketTarget,
  StreamOptions,
  WebSocketOptions,
} from './types';
