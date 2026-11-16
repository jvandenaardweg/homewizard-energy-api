/*
 * The API v2, exported from the package root as the `v2` namespace:
 *
 *   import { v2 } from 'homewizard-energy-api';
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export type { DeviceOptions } from './client';
export * from './devices';
export { Discovery, fromDiscovery } from './discovery';
export type { DiscoveredDevice, DiscoveryOptions, DiscoveryResponse } from './discovery';
export {
  HomeWizardApiV2Error,
  HomeWizardApiV2PairingError,
  HomeWizardApiV2WebSocketError,
} from './errors';
export { pair } from './pairing';
export type { PairOptions, PairResult } from './pairing';
export { poll } from './poll';
export type { Poller, PollOptions } from './poll';
export { CERTIFICATE_PRODUCT_TYPES, getCertificateIdentifier, HOMEWIZARD_CA_CERT } from './tls';
export * from './types';
export { DeviceSocket } from './websocket';
export type { BatteriesTopic, CommonTopics, WebSocketOptions } from './websocket';
