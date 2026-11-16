# AGENTS.md

This is a typed Node client for the HomeWizard Energy local API: API v1 over HTTP (P1 meter, Energy Socket, water meter, kWh meters) and API v2 over HTTPS (P1 meter, kWh meters, Plug-In Battery), with mDNS device discovery. The upstream docs are at https://api-documentation.homewizard.com, with their source in the `homewizard/api-documentation` GitHub repo. It is published to npm as `homewizard-energy-api`, and usage docs live in `README.md`.

## Verifying changes

- `npm test` is the full gate: lint (including Prettier formatting), type-check, then vitest with coverage. Aim for 100% coverage, so new code comes with tests for each branch. It's a target, and the config doesn't enforce a threshold. The husky pre-commit hook runs lint-staged to format staged files, then `npm test`, whose `prettier --check .` also reads unstaged files, so format those first or the commit fails.
- To run a single test file: `TZ=Europe/Amsterdam npx vitest run src/utils/telegram.test.ts`. Always set `TZ=Europe/Amsterdam`, because telegram timestamps are formatted in local time and the expected test values are hard-coded to Amsterdam offsets.
- Scripts in `src/examples/` call hard-coded LAN IPs and need a real device, so tests are the way to verify behaviour.

## Compatibility

- The supported runtime is Node >=22.19 (`engines.node`), the lowest version undici 8 supports. CI tests Node 22, 24 and 26, and the TypeScript target and lib are ES2024. Use only APIs that Node 22.19 offers. HTTP goes through `undici` and dates go through `date-fns`.
- The dev tooling needs a newer Node than the library: release-it supports `^22.22.2 || ^24.15.0 || >=26`, and vitest doesn't list Node 25. Develop on the version in `.nvmrc`.
- The toolchain doesn't load the TypeScript compiler API, so `typescript` can be TypeScript 7, which has none: Oxlint lints, tsx runs `src/examples/`, and tsc-alias rewrites the `@/` paths. Keep it that way, or a tool will need TypeScript 6 again.
- The public API is everything re-exported from `src/index.ts`. This is a semver library, so renaming or removing an export or a response field is a breaking change.

## Architecture

- The library has two APIs side by side. The v1 classes (`src/*-api.ts`) talk HTTP to `/api/v1`. The API v2 (`src/v2/`) talks HTTPS with a token, and is exported as the `v2` namespace from `src/index.ts`. Both build on `src/shared/` (request with timeout, errors, logger, polling loop, mDNS discovery), which keeps the v1 classes' public and protected API unchanged.
- `BaseApi` (`src/base-api.ts`) holds the v1 request, error, logging and polling logic as `protected` methods, delegating to `src/shared/`. Each v1 device class extends it and re-exposes the methods that device supports as public overrides, narrowing the generic to its own response type. New device methods follow the same pattern.
- Polling is exposed as `api.polling.<method>.start() / stop() / on('response' | 'error', …)`, backed by one EventEmitter per instance that emits method-scoped events (`getData:response`, `getData:error`). A device class adds polling methods by extending the `polling` getter, and sets each method's `on` to `this.pollingOn('<method>')` so its listeners receive only that method's events.
- The API v2 uses composition. `src/v2/endpoints.ts` has one function per endpoint, taking the internal `Client` (`src/v2/client.ts`: TLS agent, token, `X-Api-Version`, `HomeWizardApiV2Error`). The device classes in `src/v2/devices/` extend `Device`, which holds what every v2 device supports, and add only the endpoints their device supports, following the capability matrix in `docs/v2-design.md`. A device without an endpoint has no method for it.
- The API v2 checks the device's certificate: the HomeWizard CA, and the Common Name against the `identifier` (`appliance/<type>/<serial>`). The device classes require the identifier unless `insecure: true`; only `pair()` connects without one, to learn it from the certificate. Values from mDNS are untrusted, so `fromDiscovery()` compares the discovered `id` with the stored identifier. Tokens stay out of logs: log bodies through `redact()`.
- Response types in `src/types.ts` and `src/v2/types.ts` mirror the upstream API exactly. Field names stay snake_case, and data points are optional because devices omit null values. Each field's JSDoc names the devices that send it ("Available for: `HWE-P1`"), and each type has an `@link` to the upstream docs. Those links point at https://api-documentation.homewizard.com (the old `homewizard-energy-api.readthedocs.io` site is offline). These comments ship in `dist` as editor docs.
- Both `@/` alias imports and relative imports appear in `src`. The `@/` alias works in `dist` only because the build rewrites it with `tsc-alias`, and vitest resolves it through its own alias in `vitest.config.mts`.

## Adding an endpoint or device

The change is done when every applicable item is covered:

1. The URL goes in the class's `endpoints` getter and the method goes on the device class.
2. Request and response types go in `src/types.ts`.
3. Add an interceptor to `src/mocks/api.ts` and fixture data to `src/mocks/data/`.
4. Add tests to the device's `*.test.ts`, covering a success case and an error status (500).
5. For a new device, also add its product type to `SupportedDevicesList` in `src/types.ts` and to `mockBasicInformationResponse` in `src/mocks/data/basic.ts`. Export the new class from `src/index.ts`, add an example to `src/examples/`, and add a README section.

For the API v2, the same items apply with the v2 files:

1. The function goes in `src/v2/endpoints.ts`, and the method on each device class in `src/v2/devices/` whose device supports it, per the upstream docs.
2. Types go in `src/v2/types.ts`, and a new WebSocket topic in `src/v2/websocket.ts`.
3. Fixtures go in `src/mocks/data/v2.ts`, mocked with `mockV2()` from `src/mocks/api-v2.ts`.
4. Tests go in `src/v2/endpoints.test.ts` and the table in `src/v2/devices/devices.test.ts`, including the device's `missing` methods.
5. For a new device, add its product type to `ProductTypeList` in `src/v2/types.ts`, `CERTIFICATE_PRODUCT_TYPES` in `src/v2/tls.ts` and `DEVICE_CLASSES` in `src/v2/discovery.ts`, export it from `src/v2/devices/index.ts`, and add it to the README's v2 method table.

## Tests

- `vitest.setup.ts` installs a global undici `MockAgent` with real network disabled, and it turns on fake timers before every test.
- Each request needs its own `apiMocks.<name>()` call, because an interceptor is used up after one reply.
- Discovery tests replace `multicast-dns` with `vi.mock`, using helpers from `src/mocks/mdns.ts` and `src/mocks/mdns-v2.ts`.
- The v2 device classes create their own TLS agent, which bypasses the global `MockAgent`, so v2 tests pass it as `dispatcher` (`mockV2DeviceOptions`).
- The certificate checks and the WebSocket need a real TLS handshake, which `MockAgent` skips. Those tests use the local server in `src/mocks/tls/` (a test CA, and a minimal WebSocket server that scripts a device) with real timers: call `vi.useRealTimers()` in `beforeEach` and `vi.useFakeTimers()` again in `afterEach`, because the global `afterEach` runs the fake timers.

## Commits and releases

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`), because the changelog and the version bump are built from them. `@release-it/conventional-changelog` groups the release notes by type, in this order: breaking changes, `feat`, `fix`, `perf`, `revert`, `docs`, then `refactor`, `test`, `chore`, `ci`, `build` and `style` under "Other Changes". A commit without a recognised type is left out. Each release ends with a Contributors section that credits commit authors and `Co-authored-by` trailers, leaving out the maintainer, bots and AI agents (the filters and the GitHub profile lookup are in `.release-it.cjs`). Use `docs:` for JSDoc changes in `src/types.ts`, since they ship to users as editor docs.
- `CHANGELOG.md` is written by that plugin during `npm run release`, so edits belong in commit messages, not in that file.
- Release only when the maintainer asks for it. The steps, checks and failure fixes are in the `release` skill (`.claude/skills/release/SKILL.md`).
