# API v2 implementation plan

This plan builds [v2-design.md](v2-design.md) in small PRs. Each PR passes `npm test` on its own and ships as a minor or patch release in 2.x, without breaking changes. Each PR also follows the "Adding an endpoint or device" checklist in `AGENTS.md`, with the v2 equivalents of its files.

Work taken from [jvandenaardweg/homewizard-energy-api#135](https://github.com/jvandenaardweg/homewizard-energy-api/pull/135) gets a `Co-authored-by: Nebz <…>` trailer on the commit that uses it, so NebzHB shows up under Contributors in the release notes.

## Status (16 November 2026)

Steps 0 to 8 are built on one branch, one commit per PR. What's still open:

- **Hardware checks that need a button press.** On a real P1 Meter (API 2.2.0) the following are confirmed: the certificate CN matches the mDNS `id`, a strict check rejects another identifier, `checkServerIdentity` runs on each connection, 401 `user:unauthorized` is parsed, a pairing times out without a button press, the WebSocket sends `authorization_requested`, and a wrong token makes the device drop the connection (now reported as `user:unauthorized`). Still unchecked: pairing with the button, and every authorized endpoint and WebSocket topic.
- **kWh meters and Plug-In Battery:** built from the docs, untested on hardware.
- **Deprecations of the v1 classes:** not done, because they wait for the hardware checks.
- **The WebSocket heartbeat** assumes the device answers a `{"type":"device"}` request, as the docs describe. If it answers with an error instead, users get an `error` event every interval. This needs a token to check.
- **The token-rejection rule** comes from one P1: a drop between sending the token and `authorized` stops reconnecting for good, so a network drop in that short window does too.

## Order and dependencies

```
Step 0  spike: TLS identity on the real P1 (no PR)
PR 1    fix: Belgian telegram (#100)  ── independent, release it before PR 3 merges
PR 2    refactor: shared/ extraction
          └─ PR 3  feat: v2 foundation (client, TLS, pairing, users, all endpoint functions, poll)
                ├─ PR 4  feat: v2.P1Meter        ── verify on the maintainer's P1
                │     └─ PR 5  feat: v2 WebSocket ── verify on the maintainer's P1
                └─ PR 6  feat: v2 kWh meters + Plug-In Battery ── needs a hardware tester
                      └─ PR 7  feat: v2 discovery + fromDiscovery()  (needs PRs 4 and 6)
PR 8    docs: README v2 section, migration table, AGENTS.md; v1 deprecations as devices get verified
```

PR 3 contains every endpoint function and its types, so PRs 4 and 6 only add device classes and can run in parallel. PR 6 is a good fit for NebzHB, because it needs a kWh meter and a battery. PR 7 waits for both, because `fromDiscovery()` returns their classes.

**Release freeze.** `export * as v2` lands in PR 3. Once a release goes out, the `v2.*` names and the `pair()` return shape are public API. So: release PR 1 (and PR 2) before PR 3 merges. Then cut no release until PR 4's hardware check has passed.

## Step 0: check the TLS identity on the real P1

Decision 4 depends on the device putting `appliance/p1dongle/<serial>` in the certificate CN. This is a quick spike with no PR. Point the local TLS spike script at the maintainer's P1, using the HomeWizard CA:

- Print the CN, and check that it matches the `id` TXT record from `_homewizard._tcp`.
- Check that a strict check with that identifier passes, and that a wrong one is rejected.
- Make two requests on one `Agent`, and two on separate agents, and check whether `checkServerIdentity` runs each time. If TLS session resumption skips it, the identifier capture in `pair()` has to rely on a fresh agent per attempt (which the plan already uses). Strict mode then needs its own check of the resumed session.

If the identifier isn't in the CN (for example, only in a SAN), revisit decision 4 before PR 3.

## PR 1: `fix: parse the capacity tariff lines of Belgian telegrams`

Fixes #100. Main's `parseTelegram` still drops `1-0:1.4.0`, `1-0:1.6.0` and `0-0:98.1.0`. This was checked with the PR's `v50beDemand` fixture.

- Port the `demand` handling from the PR's `src/utils/telegram.ts` onto main's version. It's a port, not a cherry-pick, because main's parser changed after the PR's base (+80 −38). Adding `power.demand` to `ParsedTelegram` only adds a field, so it isn't breaking.
- Add the `v50beDemand` fixture and its expected result to `src/mocks/data/telegram.ts`.
- Tests in `src/utils/telegram.test.ts`: the current average, the monthly peak with its timestamp, the 13-month history, and an empty history (`0-0:98.1.0(0)`). Also check that the line is no longer logged as unparsed.
- Done when: `npm test` passes and the issue's sample lines parse without warnings.

## PR 2: `refactor: move the request, error, logger and polling code out of BaseApi`

No public change. This PR exists so that v2 can reuse the code without extending `BaseApi`.

- New `src/shared/request.ts`: undici request plus the timeout race (today's `BaseApi.request`, `abortAfter`, `describeCall`), with an optional `dispatcher`.
- New `src/shared/errors.ts`: `HomeWizardEnergyApiError`, `…ResponseError` and `…TimeoutError`, moved and re-exported from `base-api.ts` under the same names.
- New `src/shared/logger.ts`: the log function and default prefix.
- New `src/shared/poller.ts`: the interval loop, `stopOnError` and the method-scoped emitter (today's `startPolling`, `stopPolling`, `pollingOn` and `emitPollingEvent`).
- New `src/shared/mdns-discovery.ts`: an `MdnsDiscovery` class with the TXT, PTR and A record parsing from `homewizard-energy-discovery.ts`, with the service type as a parameter.
- `BaseApi` and `HomeWizardEnergyDiscovery` call these modules, and every protected method keeps its signature.
- Done when:
  - all existing tests pass unchanged, and coverage stays the same;
  - `dist/base-api.d.ts`, `dist/homewizard-energy-discovery.d.ts` and `dist/index.d.ts` describe the same public surface as before. Build before and after, and diff them; moving declarations is fine, removing them is not.

## PR 3: `feat: add the API v2 foundation`

- `src/v2/index.ts`, and `export * as v2 from './v2'` in `src/index.ts`. The spike confirmed this works through `tsc` + `tsc-alias`.
- `src/v2/tls.ts`:
  - `HOMEWIZARD_CA_CERT` (the PR's copy matches upstream `static/homewizard-ca-cert.pem`);
  - `CERTIFICATE_PRODUCT_TYPES` (`HWE-P1` → `p1dongle` and so on, from the authorization docs);
  - `getCertificateIdentifier(productType, serial)`;
  - `createCheckServerIdentity(expected?, onCertificate?)`, where the callback captures the CN for pairing.
- `src/v2/errors.ts`:
  - `HomeWizardApiV2Error` with `code`, typed as the known codes from the error-handling docs plus `string`;
  - `HomeWizardApiV2PairingError` with `reason: 'timeout' | 'aborted'`.
- `src/v2/client.ts` (`Client`, internal; the device classes take its `DeviceOptions`):
  - builds `https://<host>`, the TLS `Agent` (or an injected `dispatcher`), and the `X-Api-Version: 2`, `Authorization` and `Content-Type` headers;
  - parses errors from JSON (`{"error": …}`) and from plain text (telegram);
  - throws when `identifier` is missing without `insecure: true`;
  - `close()` closes the agent.
- `src/v2/endpoints.ts`: one function per endpoint for all devices. PRs 4 and 6 then only add classes.
  - `device.ts`: `getDevice`.
  - `measurement.ts`: `getMeasurement<T>`.
  - `system.ts`: `getSystem`, `updateSystem`, `identify` and `reboot`.
  - `telegram.ts`: `getTelegram`.
  - `batteries.ts`: `getBatteries` and `updateBatteries`.
  - `users.ts`: `createUser`, `listUsers` and `deleteUser`. `createUser` adds the `local/` prefix and checks the name against `^local\/[a-zA-Z0-9\-_/\\# ]{1,40}$` before sending.
- `src/v2/pairing.ts`: `pair(host, name, options)`.
  - It retries on `user:creation-not-enabled` (403) and on network errors, and stops on any other API error.
  - Options: `pairTimeout` (default 120 s), `interval` (default 2 s), `signal` and `onAttempt(remainingMs)`.
  - It returns `{ token, identifier }`, with the identifier taken from the certificate CN.
  - It uses its own short-lived agent with the chain-only check. A `dispatcher` option lets tests inject one.
- `src/v2/poll.ts`: `v2.poll(fn, { interval, stopOnError })` returns `{ start, stop, on }`, built on `shared/poller.ts`.
- `src/v2/types.ts`: all response and update types, covering measurement per device, system per device, `Batteries` and `BatteriesUpdate`. Each `Batteries` field carries a "from API 2.x" note, and the `standby` and `to_full` modes get `@deprecated`. Plus `DeviceInformation`, `User`, `UserCreated`, the error codes, and `ProductType` (`HWE-P1`, `HWE-KWH1`, `HWE-KWH3`, `SDM230-wifi`, `SDM630-wifi`, `HWE-BAT`). Every type has JSDoc with "Available for:" and an `@link` to api-documentation.homewizard.com.
- Test setup:
  - `src/mocks/api-v2.ts`: interceptors on the `https://<ip>` origin of the existing `mockApiAgent`, passed in as `dispatcher`;
  - `src/mocks/data/v2/`: fixtures copied from the docs' examples;
  - `src/mocks/tls/`: a test CA, a device certificate with CN `appliance/p1dongle/<serial>`, and a helper that starts a local `node:https` server. `MockAgent` skips the TLS handshake, so the CN capture and the strict check are tested against this server instead. Exclude the folder from the build. PR 5 adds the WebSocket upgrade to the same server.
- Tests:
  - TLS, against the local server with real timers: matching, different and missing CN; `pair()` capturing the CN; and a rejection without the CA.
  - Client: a missing identifier throws; the headers are sent; JSON and text errors parse into `code`; an unknown code is kept as a string.
  - Pairing, with fake timers: button pressed on the third attempt, timeout, abort during the wait, `user:name-invalid` stops immediately, a network error retries, and the name is validated.
  - Users: list, delete by name, and delete the current user.
  - Poll: start, stop, response, error and `stopOnError`.
  - Every endpoint: success and a 500.
- Done when: `npm test` passes at 100% coverage for `src/v2`, and `import { v2 } from 'homewizard-energy-api'` works from `dist`.

## PR 4: `feat: add v2.P1Meter`

- `src/v2/devices/p1-meter.ts`, delegating to the endpoint functions from PR 3,: `getDevice`, `getMeasurement`, `getSystem`, `updateSystem`, `identify`, `reboot`, `getTelegram`, `getBatteries`, `updateBatteries`, `users`, `close`, and `static pair()`.
- `src/examples/v2-p1-meter.ts`: pair once, store the token and identifier in `.env` (already gitignored), then read the measurement, system and telegram.
- Tests: success and a 500 for each method, a telegram 503 with `telegram:no-telegram-received`, and a `json:parameter-invalid-type:…` error on `updateSystem`.
- **Hardware check on the maintainer's P1:**
  - pairing with the button;
  - the identifier captured during pairing matches `appliance/p1dongle/<serial>`;
  - a strict check accepts it, and a wrong identifier is rejected;
  - every method returns data that fits the types.

  Note any field that differs from the docs.

## PR 5: `feat: add the v2 WebSocket`

- **Spike first, on the real P1:** undici `WebSocket` with the client's agent as `dispatcher`; handshake timing; how often measurements are pushed; what happens on Wi-Fi loss; whether `ping()` keeps the connection alive. Record the results in the PR description. If undici falls short, fall back to `ws` as a dependency.
- `src/v2/websocket.ts` (`DeviceSocket<Topic>`):
  - `subscribe`, `unsubscribe`, `request(topic)`, `set(topic, data)`, `identify` and `close`;
  - typed `on()` for each topic, plus `authorized`, `close` and `error`;
  - errors from `{"type":"error","data":{"message":…}}` become `HomeWizardApiV2Error`;
  - subscriptions are sent again after reconnect, with exponential backoff, and a heartbeat sends `{"type":"device"}` after a silent interval and reconnects after two.
- `P1Meter.openWebSocket()`, with topics narrowed per device.
- Port the PR's message handling from `websocket-v2.ts`, adapted to undici events.
- Tests:
  - the local server from PR 3's `src/mocks/tls/`, extended to handle the upgrade and script the device;
  - the cases: handshake, a missing token, subscribe and push, an error message, a wrong-CN rejection, and drop-then-reconnect with the subscriptions sent again;
  - these tests need real timers, so they call `vi.useRealTimers()` (the setup turns on fake timers globally).
- **Hardware check on the maintainer's P1:** run for 30 minutes with a measurement subscription, unplug the Wi-Fi once, and confirm it reconnects.

## PR 6: `feat: add v2 kWh meters and the Plug-In Battery`

- `v2.KwhMeter1Phase` and `v2.KwhMeter3Phase`: no `identify`, no `getTelegram`, and a system update type without `status_led_brightness_pct`. The pairing note says to hold the button for 1–3 seconds.
- `v2.PlugInBattery`: no `reboot`, `getTelegram` or batteries endpoints; `cloud_enabled` is read-only (left out of the update type), and there's no `api_v1_enabled`.
- Examples, mocks and tests, following PR 4. The types and endpoint functions already exist from PR 3.
- **Hardware check:** NebzHB or another owner of a kWh meter and battery runs the examples and posts the output in the PR. This must happen before merging.

## PR 7: `feat: add v2 discovery`

- `v2.Discovery` on `_homewizard._tcp`, extending `shared/mdns-discovery.ts`. Its `DiscoveryResponse` has the `api_version`, `id`, `serial`, `product_name` and `product_type` TXT records. The v1 `HomeWizardEnergyDiscovery` and its types stay as they are.
- `v2.fromDiscovery(response, { token, identifier })` picks the class from `product_type` and throws on an unknown product type. mDNS is unauthenticated, so it takes the identifier stored at pairing and throws when the discovered `id` differs, so the token is never sent to another device.
- Tests with the `src/mocks/mdns.ts` helpers: a v2 response; a device that answers on both services; and an unknown product type.

## PR 8: docs and deprecations

- README: a "Using API v2" section with pairing, storing the token and identifier, the methods per device, the WebSocket and `v2.poll`. Add a migration table from v1 (field names from the design doc) and a note that v1 is being phased out upstream.
- `AGENTS.md`: describe the `src/v2` architecture (composition over inheritance), and add the v2 version of the "Adding an endpoint or device" checklist.
- Deprecations, as `docs:` commits once each hardware check has passed: `@deprecated Use v2.P1Meter` on `P1MeterApi`, then the same for the kWh classes. `EnergySocketApi` and `WaterMeterApi` are left alone.

## Later (v3)

- An `exports` map with `.` and `./v2`.
- Removal of the v1 classes once upstream removes v1, or once every device has v2.

## Before starting

- Reply on PR 135 (draft to be agreed first). Thank NebzHB, explain the direction, and link the design doc. Ask which devices they tested on and whether they want to take PR 6. Mention that their Jeedom plugin will need to move from the fork's `dist` branch, and from the `*ApiV2` names, to `v2.*`.
- Close PR 135 once PR 3 lands, or once NebzHB agrees.
