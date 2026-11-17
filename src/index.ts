/*
 * The package root: the API v2.
 *
 *   import { pair, P1Meter } from 'homewizard-energy-api';
 *
 * The API v1 is in `./v1` and the telegram parser in `./telegram`, each with its own entry point.
 *
 * Everything exported here is public API. Keep helpers and constants that users don't need out of it: adding an
 * export later is a feature, removing one is a breaking change.
 *
 * @link https://api-documentation.homewizard.com/docs/category/api-v2
 */
export { isApiVersionAtLeast } from './api-version';
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
export { getCertificateIdentifier, isSameIdentifier } from './tls';
// The mDNS constants stay internal: 2.x exported the same names from the root with the v1 values
export { ProductTypeList } from './types';
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
