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

Composition instead of inheritance. A device class holds a client and delegates to endpoint functions, and exposes only what that device supports. That removes the "protected in the base, public in the subclass" boilerplate.

```
src/
  shared/                  # extracted from base-api.ts, used by v1 and v2
    request.ts             # undici request + timeout race (today's BaseApi.request)
    errors.ts              # HomeWizardEnergyApiError and friends (re-exported unchanged)
    logger.ts
    poller.ts              # interval loop + method-scoped emitter (today's startPolling/pollingOn)
    mdns.ts                # TXT/PTR/A parsing, service type as a parameter
  v2/
    client.ts              # V2Client: base URL, TLS agent, token, X-Api-Version, error parsing
    tls.ts                 # HomeWizard CA, checkServerIdentity on CN, certificate identifier helper
    errors.ts              # HomeWizardApiV2Error { code }, HomeWizardApiV2PairingError
    pairing.ts             # pair(): retry POST /api/user until the button is pressed
    poll.ts                # v2.poll(fn, options), on shared/poller.ts
    endpoints/             # plain functions: (client, ...args) => Promise<T>
      device.ts  measurement.ts  system.ts  users.ts  telegram.ts  batteries.ts
    websocket.ts           # DeviceSocket<Topics>
    devices/
      p1-meter.ts  kwh-meter-1-phase.ts  kwh-meter-3-phase.ts  plug-in-battery.ts
    discovery.ts           # _homewizard._tcp
    types.ts               # mirrors upstream, snake_case, optional data points
    index.ts
```

**Refactoring `base-api.ts`.** `BaseApi` is exported and its protected methods are part of the public API for anyone who subclasses it. In 2.x its signatures stay as they are. The bodies move into `shared/`, and `BaseApi` calls them. v2 uses `shared/` directly and never extends `BaseApi`.

### Client

```ts
interface V2ClientOptions {
  /** From pair() or a stored value. Without one, only pair()/createUser() work. */
  token?: string;
  /** `appliance/<cert product type>/<serial>`, returned by pair() or the `id` TXT record from discovery. Required unless `insecure`. */
  identifier?: string;
  /** Skip certificate validation. Debugging only. */
  insecure?: boolean;
  /** Pin a major version with X-Api-Version. Defaults to '2'. */
  apiVersion?: '2';
  timeout?: number;
  logger?: LoggerOptions;
  /** Inject a dispatcher (tests use MockAgent). Defaults to an undici Agent with the HomeWizard TLS options. */
  dispatcher?: Dispatcher;
}
```

- Only `pair()` connects without an identifier, using a chain-only check, and it returns the identifier it saw (decision 4). The constructor throws when `identifier` is missing and `insecure` is not set.
- The certificate uses legacy product types (`p1dongle`, `energymeter`, `battery`, …), so `tls.ts` exports a helper that builds the identifier from `product_type` and `serial`.
- Errors: JSON endpoints return `{"error": "<scope>:<code>"}`, and `/api/telegram` returns the code as plain text. Both map to `HomeWizardApiV2Error.code`. The type is a union of the known codes plus `string`, because upstream says new codes will be added.

### Devices

```ts
class P1Meter {
  constructor(host: string, options: V2ClientOptions);
  static pair(
    host: string,
    name: string,
    options?: PairOptions & V2ClientOptions,
  ): Promise<{ device: P1Meter; token: string; identifier: string }>;

  getDevice(): Promise<DeviceInformation>;
  getMeasurement(): Promise<P1MeterMeasurement>;
  getSystem(): Promise<P1MeterSystem>;
  updateSystem(params: P1MeterSystemUpdate): Promise<P1MeterSystem>;
  identify(): Promise<void>;
  reboot(): Promise<void>;
  getTelegram(): Promise<string>;
  getBatteries(): Promise<Batteries>;
  updateBatteries(params: BatteriesUpdate): Promise<Batteries>;
  users: { list(): Promise<User[]>; delete(name?: string): Promise<void> };
  openWebSocket(): DeviceSocket<'device' | 'user' | 'measurement' | 'system' | 'batteries'>;
  close(): Promise<void>;
}
```

`KwhMeter1Phase` and `KwhMeter3Phase` have no `identify` or `getTelegram`, and its system type has no `status_led_brightness_pct`. `PlugInBattery` has no `reboot`, `getTelegram` or `getBatteries`, and `cloud_enabled` is read-only in its system update type.

The method names follow the endpoints (`getMeasurement`, `getDevice`), not v1's `getData`/`getBasicInformation`. Nothing needs to stay compatible with v1, because these are new classes.

A factory covers the common "discover, then connect" flow:

```ts
// uses the `id` TXT record as identifier, picks the class from product_type
const device = await v2.fromDiscovery(discovered, { token }); // P1Meter | KwhMeter1Phase | KwhMeter3Phase | PlugInBattery
```

**Parsed telegram.** v2 measurement already includes the Belgian capacity-tariff fields and the external gas and water meters. Upstream says: "If you need parsed data, use the measurement endpoint". So v2 has no `getParsedTelegram`. `parseTelegram` stays available as a standalone export for anyone who wants it.

### WebSocket

```ts
const socket = p1.openWebSocket();
socket.on('measurement', m => ...);   // typed per device
socket.on('error', e => ...);         // HomeWizardApiV2Error, from {"type":"error","data":{"message":"..."}}
socket.subscribe('measurement');
socket.request('system');             // one-off read over the socket
socket.set('system', { status_led_brightness_pct: 50 });
socket.identify();
socket.close();
```

- Handshake: the device sends `authorization_requested`, and the client must send `authorization` with the token within 40 s. Subscriptions are sent again after every reconnect.
- Reconnect with backoff. Detect a dead connection with a "nothing received within N seconds" watchdog, plus `ping`.
- Transport: undici's `WebSocket` with the same TLS `Agent` as HTTPS, passed as `dispatcher`. A local spike confirmed that the custom certificate check runs. undici exports `ping(ws)` but no pong event, so liveness detection rests on the watchdog. Check that against a real P1 before dropping the PR's `ws` dependency for good.

### Discovery

Leave `HomeWizardEnergyDiscovery` and `DiscoveryResponse` unchanged. The PR widens `txt` to a union, and that changes a response type. Add `v2.Discovery`, which browses `_homewizard._tcp` and returns its own response type with `api_version` and `id`. The mDNS parsing moves into `shared/` so both discovery classes use it. A device that speaks both versions shows up once in each.

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

Field availability by API version, for `/api/batteries`: `mode` from 2.1.0 (`predictive` from 2.3.0), `permissions` and `battery_count` from 2.2.0, `charge_to_full` from 2.3.0. `standby` and `to_full` are legacy modes. Mark them `@deprecated` in the JSDoc.

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
- WebSocket: `MockAgent` doesn't mock WebSockets. Run a local server in tests (a `node:http` upgrade handler, or `ws` as a dev dependency only) that scripts the handshake, auth, subscribe, error and drop/reconnect.

## Rollout

See [v2-implementation-plan.md](v2-implementation-plan.md).

From PR 135, carry over with `Co-authored-by`: the v2 types (checked against the docs), the CA certificate (matches upstream `static/homewizard-ca-cert.pem`), `checkServerIdentity`, the pairing loop, the WebSocket message handling, and the discovery changes for `_homewizard._tcp`.
