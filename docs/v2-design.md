# API v2 design sketch

Status: decisions made (16 November 2026). Nothing here is implemented yet. The build order is in [v2-implementation-plan.md](v2-implementation-plan.md).

This sketch describes how to add the HomeWizard API v2 to this library. It is based on the upstream docs at [homewizard/api-documentation@d89ea01](https://github.com/homewizard/api-documentation/tree/d89ea01) (11 November 2026) and on a review of [jvandenaardweg/homewizard-energy-api#135](https://github.com/jvandenaardweg/homewizard-energy-api/pull/135).

## Decisions

1. **Export: a `v2` namespace from the root.** `import { v2 } from 'homewizard-energy-api'`, then `new v2.P1Meter(...)`, with types as `v2.P1MeterMeasurement`. It's additive, so it ships in 2.x. A subpath (`homewizard-energy-api/v2`) would need an `exports` map, which is semver-major, so it waits for v3. A code search on GitHub found no consumer that deep-imports from `dist/`. A spike confirmed that `export * as v2 from './v2'` works through `tsc` + `tsc-alias`: at runtime, in the emitted `.d.ts`, and for consumer types.
2. **Polling: WebSocket first, plus one `v2.poll()` helper.** Device classes have no `polling` getter. `v2.poll(() => p1.getMeasurement(), { interval })` returns a poller with `start()`, `stop()` and `on('response' | 'error')`, on top of the same shared loop that v1 uses.
3. **v1: extract the shared code, deprecate per device.** The v1 public API stays as it is in 2.x. A v1 class gets `@deprecated` only once its v2 class has been verified on hardware: `P1MeterApi` after `v2.P1Meter`, and the kWh classes after `v2.KwhMeter1Phase`/`3Phase`. `EnergySocketApi` and `WaterMeterApi` stay undeprecated until upstream ships v2 for those devices. v1 is removed in a later major release, once upstream removes it or every device has v2.
4. **Identifier: learned at pairing, required after that.** `pair()` checks only the certificate chain and captures the certificate's CN (`appliance/<type>/<serial>`), returning `{ token, identifier }`. After that, the device constructors require `identifier` unless `insecure: true`. This works like SSH `known_hosts`. A spike with a local TLS server and a test CA confirmed four things: undici passes `checkServerIdentity` through to `tls.connect`, the CN can be captured, a wrong CN is rejected, and undici's `WebSocket` runs the same check through `dispatcher`. It hasn't been tested against a real device yet.
5. **kWh meters: two classes,** `v2.KwhMeter1Phase` and `v2.KwhMeter3Phase`, like v1, because their measurement types differ.

## Why now, and why not the PR's structure

- Upstream has stopped v1 development: "No new features will be added to the v1 API … the v1 API will be removed in the future" ([changelog](https://api-documentation.homewizard.com/docs/changelog)). Getting started calls v2 "the stable version" and recommends it.
- v2 is a different API, not a new version of the same one. It uses HTTPS with a custom CA and hostname check, a bearer token from a button-press pairing flow, `/api/*` paths instead of `/api/v1/*`, renamed fields (see [v1 to v2 field names](#v1-to-v2-field-names)), typed error codes, and a WebSocket.
- PR 135 bends v2 into the v1 shape. `BaseApiV2 extends BaseApi` keeps `getData` pointed at `/api/measurement`. It also adds 8 subclasses that re-expose protected methods, classes for devices without v2 (socket, watermeter, display, temperature), and polling with the old `super.on` pattern. It also exposes `identify()` on the kWh meters, which the docs say they don't support.

## Shape

The endpoints are plain functions that take a client, and the device classes call them. A small `Device` base class holds what every v2 device supports (device information, measurement, system, users, the WebSocket, `close()` and the static `pair()`), and each device class adds only the endpoints its device supports. That avoids the v1 pattern of protected methods in the base that each subclass makes public again: a device without an endpoint has no method for it.

```
src/
  shared/                  # extracted from base-api.ts, used by v1 and v2
    request.ts             # undici request + timeout race, isResponseOk, parseJsonResponse
    errors.ts              # HomeWizardEnergyApiError and friends (re-exported unchanged)
    logger.ts
    poller.ts              # the polling loop (BaseApi.startPolling and v2.poll use it)
    mdns-discovery.ts      # MdnsDiscovery: TXT/PTR/A parsing, with the service type as a parameter
  v2/
    client.ts              # Client (internal): base URL, TLS agent, token, X-Api-Version, errors, redact()
    tls.ts                 # HomeWizard CA, checkServerIdentity on the CN, getCertificateIdentifier()
    errors.ts              # HomeWizardApiV2Error { code }, HomeWizardApiV2PairingError, HomeWizardApiV2WebSocketError
    endpoints.ts           # one function per endpoint: (client, ...args) => Promise<T>
    pairing.ts             # pair(): retries POST /api/user until the button is pressed
    poll.ts                # v2.poll(fn, options), on shared/poller.ts
    websocket.ts           # DeviceSocket<Topics>
    devices/
      device.ts            # Device: what every v2 device has
      p1-meter.ts  kwh-meter.ts (KwhMeter1Phase, KwhMeter3Phase)  plug-in-battery.ts
    discovery.ts           # v2.Discovery on _homewizard._tcp, fromDiscovery()
    types.ts               # mirrors upstream, snake_case, optional data points
    index.ts
```

**Refactoring `base-api.ts`.** `BaseApi` is exported and its protected methods are part of the public API for anyone who subclasses it. In 2.x its signatures stay as they are. The bodies moved into `shared/`, and `BaseApi` calls them. v2 uses `shared/` directly and never extends `BaseApi`.

### Client

The device constructors take `DeviceOptions`:

```ts
interface DeviceOptions {
  /** From pair(). Without one, every request fails with user:unauthorized. */
  token?: string;
  /** `appliance/<cert product type>/<serial>`, returned by pair(). Required unless `insecure`. */
  identifier?: string;
  /** Skip the certificate checks. Debugging only. */
  insecure?: boolean;
  /** Until the response headers arrive, including connecting. Defaults to 5000. */
  timeout?: number;
  logger?: LoggerOptions;
  /** Replaces the agent with the HomeWizard TLS checks, for example a MockAgent in tests. */
  dispatcher?: Dispatcher;
  /** Defaults to HOMEWIZARD_CA_CERT. */
  ca?: string;
}
```

- Only `pair()` connects without an identifier, using a chain-only check, and it returns the identifier from the certificate (decision 4). With `insecure: true` it builds the identifier from `GET /api` instead, because Node skips the identity check when the chain check fails. The constructors throw when `identifier` is missing and `insecure` isn't set.
- The certificate uses legacy product types (`p1dongle`, `energymeter`, `battery`, …), so `getCertificateIdentifier()` builds the identifier from `product_type` and `serial`.
- Errors: JSON endpoints return `{"error": "<scope>:<code>"}`, and `/api/telegram` returns the code as plain text. Both map to `HomeWizardApiV2Error.code`, which extends the v1 `HomeWizardEnergyApiResponseError`. The type is a union of the known codes plus `string`, because upstream says new codes will be added.
- Logged request and response bodies go through `redact()`, so a `token` field never reaches a log.

### Devices

```ts
class P1Meter {
  constructor(host: string, options: DeviceOptions);
  static pair(
    host: string,
    name: string,
    options?: PairOptions,
  ): Promise<{ device: P1Meter; token: string; name: string; identifier: string }>;

  getDevice(): Promise<DeviceInformation>;
  getMeasurement(): Promise<P1MeterMeasurement>;
  getSystem(): Promise<P1MeterSystem>;
  updateSystem(params: P1MeterSystemUpdate): Promise<P1MeterSystem>;
  identify(): Promise<void>;
  reboot(): Promise<void>;
  getTelegram(): Promise<string>;
  getBatteries(): Promise<Batteries>;
  updateBatteries(params: BatteriesUpdate): Promise<Batteries>;
  users: { list(): Promise<User[]>; delete(name: string): Promise<void> };
  openWebSocket(options?: WebSocketOptions): DeviceSocket<CommonTopics & BatteriesTopic>;
  close(): Promise<void>;
}
```

`KwhMeter1Phase` and `KwhMeter3Phase` have no `identify` or `getTelegram`, and their system type has no `status_led_brightness_pct`. `PlugInBattery` has no `reboot`, `getTelegram` or batteries endpoints, and `cloud_enabled` is left out of its system update type because it's read-only.

The method names follow the endpoints (`getMeasurement`, `getDevice`), not v1's `getData`/`getBasicInformation`. Nothing needs to stay compatible with v1, because these are new classes.

**Parsed telegram.** v2 measurement already includes the Belgian capacity-tariff fields and the external gas and water meters. Upstream says: "If you need parsed data, use the measurement endpoint". So v2 has no `getParsedTelegram`, and `parseTelegram()` is exported from the package root for anyone who wants it.

### WebSocket

```ts
const socket = p1.openWebSocket();
socket.on('measurement', m => ...);   // typed per device
socket.on('error', e => ...);         // HomeWizardApiV2WebSocketError, from {"type":"error","data":{"message":"..."}}
socket.subscribe('measurement');
socket.request('system');             // one-off read over the socket
socket.set('system', { status_led_brightness_pct: 50 });
socket.identify();
socket.close();
```

- Handshake: the device sends `authorization_requested`, and the client must send `authorization` with the token within 40 s. Subscriptions are sent again after every reconnect, and `request()`, `set()` and `identify()` wait until the connection is authorized.
- A wrong token gets no error message: the real P1 drops the connection. Two drops in a row between sending the token and `authorized` are reported as `user:unauthorized` and stop reconnecting. A single drop reconnects, because a network drop in that moment looks the same.
- Reconnect with exponential backoff. Liveness is an application-level heartbeat: after a silent interval the socket sends `{"type":"device"}`, and the answer is hidden unless the user subscribed to `device`. After two silent intervals the connection counts as dead and is reconnected. undici exports `ping(ws)` but no pong event, so pings can't detect a dead connection.
- Transport: undici's `WebSocket` with the same TLS `Agent` as HTTPS, passed as `dispatcher`. Checked against the real P1: the certificate check runs, and `authorization_requested` arrives. The PR's `ws` dependency isn't needed.

### Discovery

`HomeWizardEnergyDiscovery` and its `DiscoveryResponse` don't change. The PR widens `txt` to a union, and that changes a response type. `v2.Discovery` browses `_homewizard._tcp` and returns its own response type, with `api_version` and `id`. Both discovery classes extend `shared/mdns-discovery.ts`. A device that speaks both versions shows up once in each.

mDNS is unauthenticated, so the discovered `id` is not trusted as the identifier. `v2.fromDiscovery(response, { token, identifier })` takes the identifier stored at pairing, and throws when the discovered `id` differs. It finds a paired device at its current IP. To pair with a discovered device, pass its IP to `pair()`.

## Capability matrix (from the docs)

|                                    | P1 (`HWE-P1`) | kWh 1-phase (`HWE-KWH1`, `SDM230-wifi`) | kWh 3-phase (`HWE-KWH3`, `SDM630-wifi`) | Plug-In Battery (`HWE-BAT`)                             |
| ---------------------------------- | ------------- | --------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| `GET /api`                         | ✓             | ✓                                       | ✓                                       | ✓                                                       |
| `/api/user` (create, list, delete) | ✓             | ✓ (hold the button 1–3 s)               | ✓ (hold the button 1–3 s)               | ✓                                                       |
| `GET /api/measurement`             | ✓             | ✓                                       | ✓                                       | ✓                                                       |
| `GET/PUT /api/system`              | ✓             | ✓ but no `status_led_brightness_pct`    | ✓ but no `status_led_brightness_pct`    | ✓ but `cloud_enabled` is read-only, no `api_v1_enabled` |
| `PUT /api/system/identify`         | ✓             | —                                       | —                                       | ✓                                                       |
| `PUT /api/system/reboot`           | ✓             | ✓                                       | ✓                                       | — (safety)                                              |
| `GET /api/telegram`                | ✓             | —                                       | —                                       | —                                                       |
| `GET/PUT /api/batteries`           | ✓             | ✓                                       | ✓                                       | —                                                       |
| `wss /api/ws`                      | ✓             | ✓                                       | ✓                                       | ✓                                                       |
| API version listed in the docs     | 2.3.0         | 2.3.0                                   | 2.3.0                                   | 2.0.1                                                   |

Field availability by API version, for `/api/batteries`: `mode` from 2.1.0 (`predictive` from 2.3.0), `permissions` and `battery_count` from 2.2.0, `charge_to_full` from 2.3.0. `standby` and `to_full` are legacy modes. TypeScript can't mark single members of a string union `@deprecated`, so the `BatteriesMode` JSDoc names them legacy and points to `permissions: []` and `charge_to_full` instead.

No v2 yet: Energy Socket, Watermeter and Energy Display are "planned"; the Temperature Humidity Meter is "exploring alternatives". None of these get v2 classes until they are documented.

WebSocket topics: `device`, `user`, `measurement`, `system` (only `cloud_enabled` and `status_led_brightness_pct` are pushed live), `batteries` (only `mode`, `permissions` and `target_power_w`), and `*`.

## v1 to v2 field names

The main renames, for the migration section of the README:

| v1 `/api/v1/data`                                          | v2                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `total_power_import_kwh`, `_t1`…`_t4`                      | `energy_import_kwh`, `energy_import_t1_kwh`…           |
| `total_power_export_kwh`, `_t1`…`_t4`                      | `energy_export_kwh`, …                                 |
| `active_power_w`, `active_power_l1_w`                      | `power_w`, `power_l1_w`                                |
| `active_voltage_*`, `active_current_*`                     | `voltage_*`, `current_*`                               |
| `active_apparent_power_va`, `active_reactive_power_var`    | `apparent_power_va`, `reactive_power_var`              |
| `active_power_factor`                                      | `power_factor`                                         |
| `active_frequency_hz`                                      | `frequency_hz`                                         |
| `smr_version`                                              | `protocol_version`                                     |
| `active_power_average_w`                                   | `average_power_15m_w`                                  |
| `montly_power_peak_w`, `montly_power_peak_timestamp` (sic) | `monthly_power_peak_w`, `monthly_power_peak_timestamp` |
| `total_gas_m3`, `gas_timestamp`, `unique_gas_id`           | entry in `external[]` with `type: 'gas_meter'`         |
| `wifi_ssid`, `wifi_strength` (in data)                     | `/api/system`: `wifi_ssid`, `wifi_rssi_db`             |
| `/api/v1/identify`, `/api/v1/system`                       | `/api/system/identify`, `/api/system`                  |

`wifi_strength` is a percentage, while `wifi_rssi_db` is a signal strength in dB, so that one is a different value, not a rename.

v2 timestamps are ISO 8601 strings without a timezone (`2024-06-28T14:12:34`). In v1 they are numbers formatted as `YYMMDDhhmmss`. Keep the v2 types as the raw string, as upstream sends it.

## Testing

- The client creates its own TLS `Agent`, which bypasses the global `MockAgent` that `vitest.setup.ts` installs. So `dispatcher` is an option and tests pass the mock agent. Interceptors target `https://<ip>`.
- TLS: unit-test `checkServerIdentity` against fixtures with a matching CN, a different CN and a missing CN.
- Pairing: with fake timers, cover button not pressed then pressed, timeout, abort mid-wait, and a non-retryable error such as `user:name-invalid`.
- Real TLS: `MockAgent` skips the handshake and doesn't mock WebSockets. `src/mocks/tls/` has a test CA, a device certificate and a local HTTPS server with a minimal WebSocket server that scripts the device: the handshake, auth, subscribe, errors, and drop/reconnect. A unit test with a fake WebSocket and fake timers covers the heartbeat timing.

## Rollout

See [v2-implementation-plan.md](v2-implementation-plan.md).

From PR 135, carry over with `Co-authored-by`: the v2 types (checked against the docs), the CA certificate (matches upstream `static/homewizard-ca-cert.pem`), `checkServerIdentity`, the pairing loop, the WebSocket message handling, and the discovery changes for `_homewizard._tcp`.
