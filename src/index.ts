/*
 * The API v2, exported from the package root as the `v2` namespace:
 *
 *   import { v2 } from 'homewizard-energy-api';
 *
 * Everything exported here is public API. Keep helpers and constants that users don't need out of it: adding an
 * export later is a feature, removing one is a breaking change.
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export type { Credentials, DeviceOptions } from './client';
export * from './devices';
export { connect, discover, Discovery } from './discovery';
export type {
  DiscoveredDevice,
  DiscoverOptions,
  DiscoveryOptions,
  DiscoveryResponse,
} from './discovery';
export { HomeWizardError } from './errors';
export type { HomeWizardErrorKind } from './errors';
export { pair } from './pairing';
export type { PairOptions, PairResult } from './pairing';
export { poll } from './poll';
export type { Poller, PollOptions } from './poll';
export { getCertificateIdentifier } from './tls';
export { MDNS_DISCOVERY_DOMAIN, MDNS_DISCOVERY_TYPE, ProductTypeList } from './types';
export type {
  Batteries,
  BatteriesMode,
  BatteriesPermission,
  BatteriesUpdate,
  DeviceInformation,
  ErrorCode,
  ExternalMeter,
  KwhMeter1PhaseMeasurement,
  KwhMeter3PhaseMeasurement,
  KwhMeterSystem,
  KwhMeterSystemUpdate,
  MdnsTxtRecord,
  P1MeterMeasurement,
  P1MeterSystem,
  P1MeterSystemUpdate,
  PlugInBatteryMeasurement,
  PlugInBatterySystem,
  PlugInBatterySystemUpdate,
  ProductType,
  System,
  Timestamp,
  User,
  UserCreated,
} from './types';
export type {
  BatteriesTopic,
  CommonTopics,
  DeviceSocket,
  IdentifiableDeviceSocket,
  StreamOptions,
  WebSocketOptions,
} from './websocket';
