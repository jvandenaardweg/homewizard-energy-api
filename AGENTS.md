# AGENTS.md

This is a typed Node client for the HomeWizard Energy local HTTP API (P1 meter, Energy Socket, water meter, kWh meters), with mDNS device discovery. It is published to npm as `homewizard-energy-api`, and usage docs live in `README.md`.

## Verifying changes

- `npm test` is the full gate: lint (including Prettier formatting), type-check, then vitest with coverage. Aim for 100% coverage, so new code comes with tests for each branch. It's a target, and the config doesn't enforce a threshold. The husky pre-commit hook runs lint-staged to format staged files, then `npm test`.
- To run a single test file: `TZ=Europe/Amsterdam npx vitest run src/utils/telegram.test.ts`. Always set `TZ=Europe/Amsterdam`, because telegram timestamps are formatted in local time and the expected test values are hard-coded to Amsterdam offsets.
- Scripts in `src/examples/` call hard-coded LAN IPs and need a real device, so tests are the way to verify behaviour.

## Compatibility

- The supported runtime is Node >=22.19 (`engines.node`), the lowest version undici 8 supports. CI tests Node 22, 24 and 26, and the TypeScript target and lib are ES2024. Use only APIs that Node 22.19 offers. HTTP goes through `undici` and dates go through `date-fns`.
- The dev tooling needs a newer Node than the library: release-it supports `^22.22.2 || ^24.15.0 || >=26`, and vitest doesn't list Node 25. Develop on the version in `.nvmrc`.
- The toolchain doesn't load the TypeScript compiler API, so `typescript` can be TypeScript 7, which has none: Oxlint lints, tsx runs `src/examples/`, and tsc-alias rewrites the `@/` paths. Keep it that way, or a tool will need TypeScript 6 again.
- The public API is everything re-exported from `src/index.ts`. This is a semver library, so renaming or removing an export or a response field is a breaking change.

## Architecture

- `BaseApi` (`src/base-api.ts`) holds the request, error, logging and polling logic as `protected` methods. Each device class extends it and re-exposes the methods that device supports as public overrides, narrowing the generic to its own response type. New device methods follow the same pattern.
- Polling is exposed as `api.polling.<method>.start() / stop() / on('response' | 'error', …)`, backed by one EventEmitter per instance that emits method-scoped events (`getData:response`, `getData:error`). A device class adds polling methods by extending the `polling` getter, and sets each method's `on` to `this.pollingOn('<method>')` so its listeners receive only that method's events.
- Response types in `src/types.ts` mirror the upstream API exactly. Field names stay snake_case, and data points are optional because devices omit null values. Each field's JSDoc names the devices that send it ("Available for: `HWE-P1`"), and each type has an `@link` to the upstream docs. Those links point at https://api-documentation.homewizard.com (the old `homewizard-energy-api.readthedocs.io` site is offline). These comments ship in `dist` as editor docs.
- Both `@/` alias imports and relative imports appear in `src`. The `@/` alias works in `dist` only because the build rewrites it with `tsc-alias`, and vitest resolves it through its own alias in `vitest.config.mts`.

## Adding an endpoint or device

The change is done when every applicable item is covered:

1. The URL goes in the class's `endpoints` getter and the method goes on the device class.
2. Request and response types go in `src/types.ts`.
3. Add an interceptor to `src/mocks/api.ts` and fixture data to `src/mocks/data/`.
4. Add tests to the device's `*.test.ts`, covering a success case and an error status (500).
5. For a new device, also add its product type to `SupportedDevicesList` in `src/types.ts` and to `mockBasicInformationResponse` in `src/mocks/data/basic.ts`. Export the new class from `src/index.ts`, add an example to `src/examples/`, and add a README section.

## Tests

- `vitest.setup.ts` installs a global undici `MockAgent` with real network disabled, and it turns on fake timers before every test.
- Each request needs its own `apiMocks.<name>()` call, because an interceptor is used up after one reply.
- Discovery tests replace `multicast-dns` with `vi.mock`, using helpers from `src/mocks/mdns.ts`.

## Commits and releases

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`), because the changelog and the version bump are built from them. `@release-it/conventional-changelog` groups the release notes by type, in this order: breaking changes, `feat`, `fix`, `perf`, `revert`, `docs`, then `refactor`, `test`, `chore`, `ci`, `build` and `style` under "Other Changes". A commit without a recognised type is left out. Each release ends with a Contributors section that credits commit authors and `Co-authored-by` trailers, leaving out the maintainer, bots and AI agents (the filters and the GitHub profile lookup are in `.release-it.cjs`). Use `docs:` for JSDoc changes in `src/types.ts`, since they ship to users as editor docs.
- `CHANGELOG.md` is written by that plugin during `npm run release`, so edits belong in commit messages, not in that file.
- Release only when the maintainer asks for it. The steps, checks and failure fixes are in the `release` skill (`.claude/skills/release/SKILL.md`).
