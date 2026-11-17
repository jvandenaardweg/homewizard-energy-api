# Contributing

Thanks for helping improve `homewizard-energy-api`. This guide covers reporting issues, setting up the project, and what a pull request needs before it can be merged.

## Reporting bugs and requesting features

Open an issue at https://github.com/jvandenaardweg/homewizard-energy-api/issues. A useful bug report includes:

- The device and its product type (for example `HWE-P1` or `HWE-SKT`) and its firmware version
- The library version and your Node.js version
- The method you called, and the response or error you got back (remove anything private, such as serial numbers or Wi-Fi names)

If the HomeWizard API itself changed or added a field, link the relevant page on https://api-documentation.homewizard.com.

## Setup

1. Fork and clone the repository.
2. Use the Node.js version in `.nvmrc` (`nvm use`).
3. Run `npm ci`. This also installs the husky pre-commit hook.

## Verifying changes

`npm test` is the full check that CI runs: Oxlint and a Prettier formatting check, the TypeScript type-check, then the vitest suite with coverage.

```bash
npm test
```

To run one test file, or to keep tests running while you work:

```bash
TZ=Europe/Amsterdam npx vitest run src/telegram/telegram.test.ts
```

```bash
npm run test:watch
```

Always set `TZ=Europe/Amsterdam` when you call vitest directly. P1 telegram timestamps are formatted in local time, and the expected values in the tests use Amsterdam offsets. The npm scripts set it for you.

Tests never touch the network. A global undici `MockAgent` answers every request, so mock each new request with `mockV2()` from `src/mocks/api-v2.ts` and fixture data in `src/mocks/data/v2.ts`. Each interceptor answers once, so a test that makes two requests needs two `mockV2()` calls.

The goal is 100% coverage, so new code should come with a test for each branch. CI doesn't enforce a threshold, but please don't lower coverage.

### Trying it against a real device

The scripts in `src/examples/` talk to real devices on your network. Pair first, which prints the credentials for the other examples:

```bash
HOMEWIZARD_HOST=192.168.1.35 npx tsx src/examples/pair.ts
```

The API v1 examples in `src/examples/v1/` need the local API enabled in the HomeWizard Energy app, and the IP address changed in the example.

This is optional. Pull requests are verified by the test suite.

## Compatibility

- **Node.js:** the library supports Node `>=22.19.0`, and CI tests on Node 22, 24 and 26. Only use APIs that Node 22.19 has. The runtime dependencies are `undici` and `multicast-dns`, plus `@types/multicast-dns` for the shipped declarations. Please discuss new runtime dependencies in an issue first.
- **Public API:** everything exported from the three entry points is public: the root (`src/index.ts`), `homewizard-energy-api/v1` (`src/v1/index.ts`) and `homewizard-energy-api/telegram` (`src/telegram/index.ts`). The package follows semver. Renaming or removing an export, a method or a response field is a breaking change.

## How the code is organised

- **The package root** is the API v2 (HTTPS with a token): `src/endpoints.ts` has one function per endpoint. The device classes in `src/devices/` extend a small `Device` base class with what every device has, and add only the endpoints their device supports. They take the credentials from `pair()`, and everything throws one `HomeWizardError`. The design is in [`docs/v2-design.md`](docs/v2-design.md).
- **`src/v1/`** is the API v1 (HTTP), frozen until HomeWizard removes it: it gets fixes, but no new endpoints or devices. `BaseApi` holds the request, error handling, logging and polling logic, and each device class (`P1MeterApi`, `EnergySocketApi` and so on) re-exposes the methods its device supports.
- **`src/telegram/`** parses the P1 telegram, and **`src/shared/`** has the request, logging, polling and mDNS code both APIs use.

The response types in `src/types.ts` and `src/v1/types.ts` mirror the HomeWizard API exactly. Field names stay snake_case, and data points are optional because devices leave out null values. Each field's JSDoc lists the devices that send it, and each type links to the upstream docs at https://api-documentation.homewizard.com. These comments ship to users as editor docs, so keep them accurate.

## Adding an endpoint or a device

A pull request that adds an endpoint is complete when it covers each of these:

1. The function in `src/endpoints.ts`, and the method on each device class in `src/devices/` whose device supports it.
2. Request and response types in `src/types.ts`.
3. Fixture data in `src/mocks/data/v2.ts`.
4. Tests in `src/endpoints.test.ts` and the table in `src/devices/devices.test.ts`, with at least a success case and an error status (500).

A new device also needs an example in `src/examples/` and a row in the README's method table. The full checklist is in "Adding an endpoint or device" in [`AGENTS.md`](AGENTS.md).

## Commits and pull requests

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/). The changelog and the version bump are generated from them, so a commit without a recognised type doesn't appear in the release notes. Common types:

| Type                                    | Use for                                         |
| --------------------------------------- | ----------------------------------------------- |
| `feat:`                                 | New endpoints, devices, fields or options       |
| `fix:`                                  | Bug fixes                                       |
| `docs:`                                 | README changes and JSDoc changes in `types.ts`  |
| `test:`, `refactor:`, `chore:`, `ci:`   | Changes that don't affect users                 |
| `feat!:` or a `BREAKING CHANGE:` footer | Anything that breaks the public API (see above) |

For example: `fix: handle a missing gas timestamp in getData`.

- Don't edit `CHANGELOG.md`. It is written during the release.
- Open pull requests against `main`. CI runs the build and `npm test` on every supported Node version.
- The pre-commit hook formats staged files and then runs the full `npm test`, so committing takes a little while. Fix a failing hook instead of skipping it with `--no-verify`.
- Keep a pull request to one change, and describe what it changes and how you tested it.

## Authorship and AI tools

Contributions are credited to the person who submits them, so commits and pull requests must come from your own GitHub account. You're welcome to use AI coding tools, but you are the author: you review the change, you can explain it, and you're responsible for it.

- Open the pull request from your own account, and author every commit with your own name and email. Pull requests opened by, or containing commits authored by, an AI agent or bot account (such as `claude[bot]` or Copilot's coding agent) are not accepted. Dependabot is the one exception.
- Leave AI credit out of commit messages and pull request descriptions. That means no `Co-authored-by:` trailers for an AI agent and no "Generated with …" footers. Human co-authors are welcome.

Pull requests that don't follow this will be asked to change before they're merged. If your tool added a credit line, remove it with `git commit --amend` for the last commit, or `git rebase -i` for earlier ones. Most tools can also be configured to stop adding these lines.

## Releases

The maintainer publishes releases. Contributors don't need to bump the version or tag anything.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
