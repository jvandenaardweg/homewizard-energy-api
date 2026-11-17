# AGENTS.md

This is a typed Node client for the HomeWizard Energy local API: API v2 over HTTPS (P1 meter, kWh meters, Plug-In Battery) at the package root, and the frozen API v1 over HTTP (P1 meter, Energy Socket, water meter, kWh meters) under `homewizard-energy-api/v1`, with mDNS device discovery. The upstream docs are at https://api-documentation.homewizard.com, with their source in the `homewizard/api-documentation` GitHub repo. It is published to npm as `homewizard-energy-api`, and usage docs live in `README.md`.

## Verifying changes

- `npm test` is the full gate: lint (including Prettier formatting), type-check, then vitest with coverage. Aim for 100% coverage, so new code comes with tests for each branch. It's a target, and the config doesn't enforce a threshold. The husky pre-commit hook runs lint-staged to format staged files, then `npm test`, whose `prettier --check .` also reads unstaged files, so format those first or the commit fails.
- To run a single test file: `TZ=Europe/Amsterdam npx vitest run src/telegram/telegram.test.ts`. Always set `TZ=Europe/Amsterdam`, because telegram timestamps are formatted in local time and the expected test values are hard-coded to Amsterdam offsets.
- Scripts in `src/examples/` call hard-coded LAN IPs and need a real device, so tests are the way to verify behaviour.

## Compatibility

- The supported runtime is Node >=22.19 (`engines.node`), the lowest version undici 8 supports. CI tests Node 22, 24 and 26, and the TypeScript target and lib are ES2024. Use only APIs that Node 22.19 offers. The runtime dependencies are `undici` (HTTP, the TLS agent and the WebSocket) and `multicast-dns`, plus `@types/multicast-dns`, because the shipped declarations use its types.
- The package is ESM (`"type": "module"`), and CommonJS users load it with `require(esm)`. Imports in `src` stay without an extension; `tsc-alias` adds `.js` in `dist` (`resolveFullPaths` in `tsconfig.json`), so Node can load them.
- The dev tooling needs a newer Node than the library: release-it supports `^22.22.2 || ^24.15.0 || >=26`, and vitest doesn't list Node 25. Develop on the version in `.nvmrc`.
- The toolchain doesn't load the TypeScript compiler API, so `typescript` can be TypeScript 7, which has none: Oxlint lints, tsx runs `src/examples/`, and tsc-alias rewrites the `@/` paths. Keep it that way, or a tool will need TypeScript 6 again.
- The public API is the three entry points in the `exports` map of `package.json`: `.` (`src/index.ts`), `./v1` (`src/v1/index.ts`) and `./telegram` (`src/telegram/index.ts`). A new entry point needs both an `exports` and a `typesVersions` entry. This is a semver library, so renaming or removing an export or a response field is a breaking change.

## Architecture

- The package root is the API v2, which talks HTTPS with a token. `src/v1/` is the API v1 (HTTP to `/api/v1`), frozen until HomeWizard removes it: it gets fixes, and no new endpoints or devices. Both build on `src/shared/` (request with timeout, the v1 errors, logger, polling loop, mDNS discovery, `AsyncQueue`), which keeps the v1 classes' public and protected API unchanged. The telegram parser in `src/telegram/` serves both.
- `src/endpoints.ts` has one function per endpoint, taking the internal `Client` (`src/client.ts`: TLS agent, token, `X-Api-Version`). The device classes in `src/devices/` extend `Device`, which holds what every device supports, and add only the endpoints their device supports, following the capability matrix in `docs/v2-design.md`. A device without an endpoint has no method for it.
- The device classes take `(credentials, options?)`: `Credentials` (`{ host, token, identifier }`) is what `pair()` returns and users store as one value, and `DeviceOptions` holds how to connect (timeout, logger, insecure, dispatcher, ca).
- The device classes, `pair()`, `connect()` and `discover()` throw, and the WebSocket emits, one `HomeWizardError` (`src/errors.ts`) with a `kind` and the device's `code`. `Client.send()` wraps every failure through `toHomeWizardError()`, including the v1 timeout and response errors that `src/shared/request.ts` throws, and network and certificate errors with the original as `cause`. `Discovery` extends the shared `MdnsDiscovery`, so its events pass mDNS errors through as they are. Pairing retries the `timeout` and `network` kinds, and any error that isn't a `HomeWizardError`.
- The API v2 checks the device's certificate: the HomeWizard CA, and the Common Name against the `identifier` (`appliance/<type>/<serial>`). The device classes require the identifier unless `insecure: true`; only `pair()` connects without one, to learn it from the certificate. Values from mDNS are untrusted, so `connect()` compares the discovered `id` with the stored identifier. Tokens stay out of logs: log bodies through `redact()`.
- Pushed data has events and async iterators side by side: `socket.on()` and `socket.stream()`, `Discovery` and `discover()`. The iterators are an `AsyncQueue` fed by the events, whose `onDone` removes the listeners. The device classes have no `polling` getter: the WebSocket pushes changes, and `poll(fn)` (`src/poll.ts`) polls any method.
- In v1, `BaseApi` (`src/v1/base-api.ts`) holds the request, error, logging and polling logic as `protected` methods, and each device class re-exposes the methods its device supports as public overrides. Polling is `api.polling.<method>.start() / stop() / on('response' | 'error', …)`, backed by one EventEmitter per instance that emits method-scoped events (`getData:response`).
- Response types in `src/types.ts` and `src/v1/types.ts` mirror the upstream API exactly. Field names stay snake_case, and data points are optional because devices omit null values. Each field's JSDoc names the devices that send it ("Available for: `HWE-P1`"), and each type has an `@link` to the upstream docs. Those links point at https://api-documentation.homewizard.com (the old `homewizard-energy-api.readthedocs.io` site is offline). These comments ship in `dist` as editor docs.
- Both `@/` alias imports and relative imports appear in `src`. The `@/` alias works in `dist` only because the build rewrites it with `tsc-alias`, and vitest resolves it through its own alias in `vitest.config.mts`.

## Adding an endpoint or device

The change is done when every applicable item is covered:

1. The function goes in `src/endpoints.ts`, and the method on each device class in `src/devices/` whose device supports it, per the upstream docs.
2. Types go in `src/types.ts`, and a new WebSocket topic in `src/websocket.ts`.
3. Fixtures go in `src/mocks/data/v2.ts`, mocked with `mockV2()` from `src/mocks/api-v2.ts`.
4. Tests go in `src/endpoints.test.ts` and the table in `src/devices/devices.test.ts`, including the device's `missing` methods.
5. For a new device, add an example to `src/examples/`, and its product type to `ProductTypeList` in `src/types.ts`, `CERTIFICATE_PRODUCT_TYPES` in `src/tls.ts` and `DEVICE_CLASSES` in `src/discovery.ts`, export it from `src/devices/index.ts`, and add it to the README's method table. When the device also has a v1 class, that class stays in `src/v1/` until upstream removes the API v1.

## Tests

- `vitest.setup.ts` installs a global undici `MockAgent` with real network disabled, and it turns on fake timers before every test.
- Each request needs its own interceptor (`mockV2()`, or `apiMocks.<name>()` in v1), because an interceptor is used up after one reply.
- Discovery tests replace `multicast-dns` with `vi.mock`, using helpers from `src/mocks/mdns.ts` and `src/mocks/mdns-v2.ts`.
- The device classes create their own TLS agent, which bypasses the global `MockAgent`, so tests pass it as `dispatcher`: `new P1Meter(mockV2Credentials, { dispatcher: mockApiAgent })`. The internal `Client` takes `mockV2DeviceOptions`.
- The certificate checks and the WebSocket need a real TLS handshake, which `MockAgent` skips. Those tests use the local server in `src/mocks/tls/` (a test CA, and a minimal WebSocket server that scripts a device) with real timers: call `vi.useRealTimers()` in `beforeEach` and `vi.useFakeTimers()` again in `afterEach`, because the global `afterEach` runs the fake timers.

## Commits and releases

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`), because the changelog and the version bump are built from them. `@release-it/conventional-changelog` groups the release notes by type, in this order: breaking changes, `feat`, `fix`, `perf`, `revert`, `docs`, then `refactor`, `test`, `chore`, `ci`, `build` and `style` under "Other Changes". A commit without a recognised type is left out. Each release ends with a Contributors section that credits commit authors and `Co-authored-by` trailers, leaving out the maintainer, bots and AI agents (the filters and the GitHub profile lookup are in `.release-it.cjs`). Use `docs:` for JSDoc changes in `src/types.ts`, since they ship to users as editor docs.
- A `BREAKING CHANGE:` footer describes the change against the last release, so leave it off changes to API that hasn't shipped yet.
- `CHANGELOG.md` is written by that plugin during `npm run release`, so edits belong in commit messages, not in that file.
- Release only when the maintainer asks for it. The steps, checks and failure fixes are in the `release` skill (`.claude/skills/release/SKILL.md`).
