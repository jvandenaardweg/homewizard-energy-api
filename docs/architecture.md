# Architecture

How `homewizard-energy-api` is put together, and why. It describes the code as it is in 3.0. The upstream API docs are at https://api-documentation.homewizard.com, with their source in the `homewizard/api-documentation` GitHub repo.

## Entry points

The package is ESM, with three entry points in the `exports` map of `package.json`:

| Import                           | Source                  | What it is                                                                 |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `homewizard-energy-api`          | `src/index.ts`          | The API v2: HTTPS with a token, a WebSocket, discovery                     |
| `homewizard-energy-api/v1`       | `src/v1/index.ts`       | The API v1: HTTP without a token. Frozen, until HomeWizard removes the API |
| `homewizard-energy-api/telegram` | `src/telegram/index.ts` | `parseTelegram()` for the raw telegram of a P1 meter                       |

The API v2 is the root because HomeWizard has stopped developing the API v1 and recommends v2. The two are different APIs, not two versions of one: v2 has HTTPS with its own certificate authority, a token from a button press, other paths and field names, typed error codes and a WebSocket. So they don't share classes. The v1 classes moved to `/v1` unchanged, and get fixes but no new endpoints or devices.

## Layout

```
src/
  index.ts          # the root entry point
  client.ts         # Client (internal): base URL, TLS agent, token, X-Api-Version, retries, logging
  tls.ts            # the HomeWizard CA, the certificate check, getCertificateIdentifier(), isSameIdentifier()
  errors.ts         # HomeWizardError, a union per kind
  api-version.ts    # isApiVersionAtLeast()
  endpoints.ts      # one function per endpoint: (client, ...args) => Promise<T>
  pairing.ts        # pair(): asks for a token until the button is pressed
  poll.ts           # poll(fn): polls any method, with events or stream()
  websocket/        # DeviceSocket (subscriptions, reconnect, stream()), on a Connection and a Heartbeat
  discovery.ts      # discover() on _homewizard._tcp, and connect()
  types.ts          # the response types, mirroring the upstream docs
  devices/          # Device, and one class per device
  shared/           # used by the root and by v1: request with timeout, logger, polling loop, mDNS, AsyncQueue, wait
  telegram/         # the telegram parser
  v1/               # the API v1
  mocks/            # test fixtures, the mock agent, the mocked API and a local TLS and WebSocket server; v1/ holds the API v1 ones
  examples/         # scripts to run against a real device
```

`src/shared` imports nothing from `src/v1` or the root, and the root imports nothing from `src/v1`. So `src/v1` can be deleted in one piece when HomeWizard removes the API v1. The tests hold to it too: the API v1 mocks and fixtures are in `src/mocks/v1`, which goes with it, and the other tests import from neither.

## Devices

The endpoints are plain functions that take the client (`src/endpoints.ts`), and the device classes call them. `Device` holds what every device has: device information, measurement, system, users, the WebSocket, `close()` and the static `pair()`. Each device class adds only the endpoints its device supports, so a device without an endpoint has no method for it.

Each class describes itself to `Device` with one spec type: its measurement, its system response, the settings it lets you change, and its socket type. The method names follow the endpoints (`getMeasurement()`, `getDevice()`), not the v1 names.

| Endpoint                           | `P1Meter` (`HWE-P1`) | `KwhMeter1Phase` (`HWE-KWH1`, `SDM230-wifi`) | `KwhMeter3Phase` (`HWE-KWH3`, `SDM630-wifi`) | `PlugInBattery` (`HWE-BAT`)                       |
| ---------------------------------- | -------------------- | -------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| `GET /api`                         | ✓                    | ✓                                            | ✓                                            | ✓                                                 |
| `/api/user` (create, list, delete) | ✓                    | ✓ (hold the button 1–3 s)                    | ✓ (hold the button 1–3 s)                    | ✓                                                 |
| `GET /api/measurement`             | ✓                    | ✓                                            | ✓                                            | ✓                                                 |
| `GET/PUT /api/system`              | ✓                    | ✓, no `status_led_brightness_pct`            | ✓, no `status_led_brightness_pct`            | ✓, `cloud_enabled` read-only, no `api_v1_enabled` |
| `PUT /api/system/identify`         | ✓                    | —                                            | —                                            | ✓                                                 |
| `PUT /api/system/reboot`           | ✓                    | ✓                                            | ✓                                            | — (for safety)                                    |
| `GET /api/telegram`                | ✓                    | —                                            | —                                            | —                                                 |
| `GET/PUT /api/batteries`           | ✓                    | ✓                                            | ✓                                            | —                                                 |
| `wss /api/ws`                      | ✓                    | ✓                                            | ✓                                            | ✓                                                 |

Some fields depend on the API version of the device's firmware. For `/api/batteries`: the endpoint and `mode` from 2.1.0, `permissions` and `battery_count` from 2.2.0, `predictive` and `charge_to_full` from 2.3.0. `isApiVersionAtLeast()` checks it. The client sends `X-Api-Version: 2`, and logs once when a device answers with a newer version than the types follow.

The Energy Socket, Watermeter and Energy Display have no API v2 yet. They get a class when HomeWizard documents it: the checklist is in `AGENTS.md`.

The P1 meter was checked on hardware (API 2.2.0): pairing, every endpoint, the WebSocket and its reconnect. The kWh meter and Plug-In Battery classes follow the upstream docs and HomeWizard's own test fixtures, and aren't tested on hardware.

## Credentials and the certificate check

`pair()` returns the credentials, `{ host, token, identifier }`, and the device classes take them as their first argument. The connection options (timeout, retries, logger) are the second.

The identifier (`appliance/<type>/<serial>`) is what the device's certificate is issued to. Devices have a certificate from HomeWizard's own certificate authority, with the identifier as its Common Name instead of a hostname. Every connection, for requests and for the WebSocket, checks both: the certificate is signed by the HomeWizard CA, and its Common Name is the stored identifier. So the token only goes to the device that was paired. It works like SSH's `known_hosts`:

- `pair()` is the only call that connects without an identifier. It checks the certificate chain and reads the identifier from the certificate.
- After that, the identifier is required. `insecure: true` skips all checks, for debugging.
- mDNS is unauthenticated, so an identifier from discovery is never trusted. `connect()` compares the discovered `id` with the stored identifier, and the certificate check still runs on the connection.

Tokens stay out of logs: every logged body goes through `redact()`.

## Requests and errors

`Client.send()` is the one place every request goes through. It adds the token and the API version, applies the timeout, and retries a `GET` that fails with a timeout or network error (twice by default). Requests that change something are never retried.

The device classes, `pair()`, `connect()` and `discover()` throw a `HomeWizardError`, and the WebSocket emits one. Its `kind` says what went wrong (`response`, `timeout`, `network`, `certificate`, `pairing`, `socket`, `invalid`), and `code` has the device's error code. In TypeScript it's a union per kind, so checking `kind` narrows the fields.

## Pushed data

The WebSocket (`DeviceSocket`) authorizes with the token, subscribes again after a reconnect, and queues commands until it's authorized. In `src/websocket/` it's three parts: a `Connection` is one connection with its authorization, the `Heartbeat` watches it for silence, and `DeviceSocket` opens a new `Connection` for each reconnect and decides when to give up. Two things came out of testing on a real P1:

- A wrong token gets no error message: the device drops the connection. Two drops in a row between sending the token and `authorized` count as a rejected token, and the socket stops. A single drop reconnects, because a network drop looks the same.
- undici has no pong event, so liveness is a heartbeat of its own: after a silent interval the socket asks for the device information, and after two it reconnects.

It uses undici's `WebSocket` with the same TLS agent as the requests, so there's no extra dependency.

Data can be read with events or with `for await`: `socket.on()` and `socket.stream()`, `poller.on()` and `poller.stream()`, and `discover()`. The iterators are an `AsyncQueue` fed by the events. A stream keeps only the latest value while the loop is busy, because every topic is a current state.

`discover()` loads `multicast-dns` on its first call, so apps that never discover don't load it.

`discover()` and the v1 `HomeWizardEnergyDiscovery` both use `MdnsDiscovery` in `src/shared/`. Its response handler reads a packet through its protected finders, so a v1 subclass can override any of them, and each finder calls a pure step in `src/shared/mdns-discovery-packet.ts`. A device announces `_hwenergy._tcp` and `_homewizard._tcp` in one packet, so it matches every record by its full name, without case and with or without the trailing dot: the PTR by the service domain, and the SRV and TXT by the fqdn the PTR points at. The host is the A record of the SRV target. `MdnsDiscovery` keeps one cache entry per fqdn, so a device is yielded again when its IP address or TXT record changes.

## Types

The response types in `src/types.ts` and `src/v1/types.ts` mirror the upstream docs: snake_case field names, and optional data points, because devices leave out what they don't have. The library passes responses through without converting them, so the upstream docs stay the reference for every field. Each field's JSDoc names the devices that send it, and those comments ship as editor docs.

## Tests

- A global undici `MockAgent` (`src/mocks/agent.ts`) answers every request, with the network disabled. The device classes create their own TLS agent, so tests pass the mock agent as `dispatcher`.
- The certificate checks and the WebSocket need a real TLS handshake, which the mock agent skips. `src/mocks/tls/` has a test CA, a device certificate, and a local HTTPS and WebSocket server that scripts a device.
- The fixtures come from the upstream docs, HomeWizard's Python library and Home Assistant, each with a source comment.
- `npm run test:package` checks the built package as a user gets it: it installs the tarball, loads each entry point, and type-checks the README examples.
