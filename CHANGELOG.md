# Changelog

## [1.6.1](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.6.0...1.6.1) (2026-11-16)


### Bug Fixes

* publish only dist and CHANGELOG.md to npm ([3659d3e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/3659d3ed64a952e8f4d056550dc17debcaa57bb8))


### Documentation

* regenerate CHANGELOG.md in the grouped release-notes format ([26becf7](https://github.com/jvandenaardweg/homewizard-energy-api/commit/26becf729a6db05ec57e6bfe501003b4487495b6))


### Other Changes

* group release notes by commit type with conventional-changelog ([080b4c3](https://github.com/jvandenaardweg/homewizard-energy-api/commit/080b4c3984196baea8f0e2e427a02fa61f73e0da))
* publish to npm with trusted publishing (OIDC) ([b1a09ee](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b1a09ee9195f668411ea4cabbc2129124fa7951c))

## [1.6.0](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.5.0...1.6.0) (2026-11-16)


### Features

* add ErrorCodes.REQUEST_TOO_LARGE and deprecate REQUEST_TO_LONG ([a026e26](https://github.com/jvandenaardweg/homewizard-energy-api/commit/a026e26792c586f7db9bbd7cc9d871ca308424f0))
* add identify() to all devices and getSystem()/updateSystem() to the water meter ([0aa7176](https://github.com/jvandenaardweg/homewizard-energy-api/commit/0aa7176855462e56e9dcf79fe551405d39e283d8))
* add missing socket and kWh meter data fields and HWE-KWH1/HWE-KWH3 device types ([ad3971b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ad3971b80f8f93902726c14fd12f531a6fc268a8))
* add voltage, current and frequency to socket and kWh meter data types ([f4a6617](https://github.com/jvandenaardweg/homewizard-energy-api/commit/f4a66176b3ad414bcc1b7ff8f2bc64fe0550bb93))
* expose the parsed API error on HomeWizardEnergyApiResponseError ([06bc42e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/06bc42e6ac75b9d712d9c94dc6a3e19135d9dff8))


### Bug Fixes

* export ParsedTelegram and its nested types ([cd3fe2b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/cd3fe2b121da85e2b987ab99c3506915867f8743))
* ignore malformed mDNS responses instead of throwing in the listener ([86c90f3](https://github.com/jvandenaardweg/homewizard-energy-api/commit/86c90f3ab61ab02586739dd7b68c6361f27ca21c))
* parse BE gas reading (0-1:24.2.3) value, unit and timestamp ([6bd3226](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6bd3226dcbda0b1978b3fc5639742c172053f018))
* restore total_liter_offset_m3 on P1MeterDataResponse ([1e2ba45](https://github.com/jvandenaardweg/homewizard-energy-api/commit/1e2ba4508fc6596505d0b895ae5ca9619fbe9532))
* scope polling events to the polled method ([c8c7d9f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c8c7d9f0306656a6ae1f36116561c84e34e0c906))
* split mDNS TXT entries on the first '=' only ([b6790c3](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b6790c3dbef4db2377ed9c8a8545b5e89ae21027))
* type the getParsedTelegram startPolling overload with ParsedTelegram ([a860273](https://github.com/jvandenaardweg/homewizard-energy-api/commit/a8602732b3e32a3c85c327d2164103b191c678e6))


### Documentation

* add AGENTS.md with project conventions for AI coding agents ([2f0ccd5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2f0ccd5ba074fe8767a24fdac22660b835fd33d2))
* add missing `@link` and 'Available for' JSDoc in types.ts ([be1e937](https://github.com/jvandenaardweg/homewizard-energy-api/commit/be1e937fa0f14d9c1f32d6c328fcfcbae0b44085))
* complete device lists in JSDoc and fix stale doc references ([01a8191](https://github.com/jvandenaardweg/homewizard-energy-api/commit/01a8191de79adff830c5ee30329c019fff21f9a2))
* document active_tariff ([f40e2a1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/f40e2a12846e21e93abf5545edd7fefac6edb2e1))
* document method-scoped polling events and pollingOn() in AGENTS.md ([1955d10](https://github.com/jvandenaardweg/homewizard-energy-api/commit/1955d101c3a388dcf30aeb0f20844f6316646532))
* drop 'only relates to the Energy Socket' from the generic data docs ([001844f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/001844fe4580cbe6ea83c3ea236e15e64895e171))
* fix 'Abailable' typo in active_power_l1_w JSDoc ([4e7d9f9](https://github.com/jvandenaardweg/homewizard-energy-api/commit/4e7d9f9eeb82e48f9f4d1ad099d9ef364363f9ba))
* list every identify-capable device on IdentifyResponse ([10de9e6](https://github.com/jvandenaardweg/homewizard-energy-api/commit/10de9e63637b9633584a3fc933462f6d16642976))
* mark gas_timestamp and gas_unique_id as deprecated ([43a7370](https://github.com/jvandenaardweg/homewizard-energy-api/commit/43a73708704c27bac36ee6eada49e2507a64d642))
* name getBasicInformation() in the README method tables ([2c40f78](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2c40f7828ea3cef033ee6ade40b6279eeb8c0369))
* note 100% coverage as a target in AGENTS.md ([cb13427](https://github.com/jvandenaardweg/homewizard-energy-api/commit/cb13427d1f01e7867ab2505c0e3c9a569d8dea20))
* point upstream API links at api-documentation.homewizard.com ([e70f9bc](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e70f9bcfeac3df1fd3db9aacb72c9df5091b13ea))
* use 'Available for:' wording on total_power_export_t1_kwh ([98a1723](https://github.com/jvandenaardweg/homewizard-energy-api/commit/98a1723671eb4dbde9e33c3034f2205e7ade7254))
* use a block JSDoc comment for KwhMeterCommonDataKeys ([da0fd48](https://github.com/jvandenaardweg/homewizard-energy-api/commit/da0fd4834aceb92c8e700fa0a55e824d6948162e))


### Other Changes

* await every rejects assertion ([6499f47](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6499f476ce14cfe6b1228f7ea30e8e8dd045bae9))
* build P1MeterDataResponse with Pick ([74c80ab](https://github.com/jvandenaardweg/homewizard-energy-api/commit/74c80ab4e34e9688f1845d84de374e38ecc314d3))
* cover 500 responses for getBasicInformation() and getData() ([0612163](https://github.com/jvandenaardweg/homewizard-energy-api/commit/061216375a155ce7432a618c24b5187ab459e0de))
* cover discovery on(), goodbye, cache and malformed mDNS records ([75cf0c0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/75cf0c06f3674ab71232889b2da078a248817cbe))
* cover DSMR 2.2 telegrams, unparsable lines and parser helper edge cases ([6d0ae9f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6d0ae9fdd1b322a4b05dc30cdc05e06c9f3a484d))
* cover Energy Socket polling, P1 telegram polling stop and unscoped on() ([462a2b8](https://github.com/jvandenaardweg/homewizard-energy-api/commit/462a2b877e38f1e5b94280a86c38ba5ce939b61a))
* **deps-dev:** bump @types/node from 20.4.5 to 20.5.7 ([4b1e873](https://github.com/jvandenaardweg/homewizard-energy-api/commit/4b1e8735ee129887dec9c3b1456025d0869f2566))
* **deps-dev:** bump nodemon from 2.0.22 to 3.0.1 ([5ca1993](https://github.com/jvandenaardweg/homewizard-energy-api/commit/5ca1993ad9783fba6a03f9e4ae46b9aeff751f6e))
* **deps-dev:** bump release-it from 15.10.2 to 16.1.5 ([ca8088b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ca8088ba157b43adc8e916a69bc813d32f5aa7bc))
* enforce 100% per-file test coverage ([7d1d16d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/7d1d16d6266fcb238b3e5f45bef800309ce45053))
* exclude .claude worktrees from vitest ([9b5898f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9b5898fb4b5fbd5b9c3d4c46259c9ae4bfcc12f4))
* fix copy-pasted suite names and endpoint paths ([e9fb713](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e9fb713674a8ebff70ff0fc8bdcbafedaae8f37e))
* lint all files in src and enforce prettier formatting ([996c390](https://github.com/jvandenaardweg/homewizard-energy-api/commit/996c3904d7c35b67ca97a5ac8c5fbb81c3d3025c))
* pin auto-changelog and the changelog template ([a557b30](https://github.com/jvandenaardweg/homewizard-energy-api/commit/a557b30fbd1d9dc175732ee19d221da994323c3c))
* rename KwhMeterDataKeys to KwhMeterCommonDataKeys ([4a2f112](https://github.com/jvandenaardweg/homewizard-energy-api/commit/4a2f11213a6ad87a4fe265c61c360ce8a92e31d7))
* set auto-changelog link templates explicitly ([f7dbcf9](https://github.com/jvandenaardweg/homewizard-energy-api/commit/f7dbcf95ff88617d1c569ca1678e744d5745fcef))
* stop enforcing a coverage threshold ([e390e32](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e390e3242c81d9b1b199a417a49b49d5bcb1cf79))

### Contributors

* [@Zandor300](https://github.com/Zandor300)


## [1.5.0](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.4.2...1.5.0) (2023-09-02)


### Features

* added total_liter_offset_m3 to water meter data API response types ([2f9c809](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2f9c809326fd0d6f2632c4669af068b2840a0d77))
* added total_liter_offset_m3 to water meter data API response types ([81da7f0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/81da7f020f1fe1cad175b015751d78f219588760))


### Other Changes

* **deps-dev:** bump @types/node from 18.14.0 to 18.14.2 ([a9d96e6](https://github.com/jvandenaardweg/homewizard-energy-api/commit/a9d96e601969ccfea6d8d73153d74714bdfce08b))
* **deps-dev:** bump @types/node from 18.14.2 to 18.15.11 ([2163b52](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2163b52a7ee615e3087d33de7a4c3b2984b36863))
* **deps-dev:** bump @types/node from 18.15.11 to 20.2.5 ([090569b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/090569bd6fd50e98b333085529e2a17fcbf07103))
* **deps-dev:** bump @types/node from 20.2.5 to 20.4.5 ([3be0888](https://github.com/jvandenaardweg/homewizard-energy-api/commit/3be0888e71a04ac087c0e54e62ccfff77d9d9485))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([fc2bf41](https://github.com/jvandenaardweg/homewizard-energy-api/commit/fc2bf410618e9e3e49d21f12e40d1c52c6aaa60c))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([37cb4d5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/37cb4d5d12aa99a6a7828feb6c6135999fd6dbf8))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([a387d0a](https://github.com/jvandenaardweg/homewizard-energy-api/commit/a387d0ae5b3234260f45ee910241cfe86f0e4b01))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([e4303b1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e4303b14e6f5179bbf2f643f180bbbc64487ddb9))
* **deps-dev:** bump @typescript-eslint/parser from 5.52.0 to 5.54.0 ([825e86e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/825e86e2e98acdcc454fc406726cad744ac57a42))
* **deps-dev:** bump @typescript-eslint/parser from 5.54.0 to 5.59.8 ([3388548](https://github.com/jvandenaardweg/homewizard-energy-api/commit/33885488683d161f813c3d1533eacd21d32f3b3a))
* **deps-dev:** bump @typescript-eslint/parser from 5.59.8 to 5.60.1 ([eff8ddf](https://github.com/jvandenaardweg/homewizard-energy-api/commit/eff8ddf83fbe6f17ad7544d4d66308ab67d94790))
* **deps-dev:** bump dotenv-cli from 7.0.0 to 7.2.1 ([2706fd1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2706fd1f888be4ac6f2d46a7e050c7cc66e25859))
* **deps-dev:** bump eslint from 8.34.0 to 8.39.0 ([c274dca](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c274dca294e1da292d2a65176915166ff8208e97))
* **deps-dev:** bump eslint from 8.39.0 to 8.40.0 ([6f9a1fc](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6f9a1fc0237063b2819519c13a06c6d854a7ef1c))
* **deps-dev:** bump eslint from 8.40.0 to 8.41.0 ([7f975fd](https://github.com/jvandenaardweg/homewizard-energy-api/commit/7f975fd510aa8fd2d5481a185910bc563f764363))
* **deps-dev:** bump lint-staged from 13.1.2 to 13.2.2 ([95de41e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/95de41ed9f2b08132a6eec384a800b377c84c4dd))
* **deps-dev:** bump lint-staged from 13.2.2 to 13.2.3 ([7d1467e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/7d1467e9ef67a5db31731789d8f4acbfc397aece))
* **deps-dev:** bump nodemon from 2.0.20 to 2.0.22 ([c7cb410](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c7cb41043f4e2191c5e97ffa714b0bbf4f1064bc))
* **deps-dev:** bump prettier from 2.8.4 to 2.8.8 ([e54aa6e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e54aa6e62a0b954fb216cccf7541dc4de3fc25a6))
* **deps-dev:** bump release-it from 15.10.0 to 15.10.2 ([6e989e1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6e989e13c23f0022f44d20b105ec340818ac992d))
* **deps-dev:** bump release-it from 15.6.0 to 15.7.0 ([e647504](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e6475042c4d04145b0d408e1a1c2e77a87976861))
* **deps-dev:** bump release-it from 15.7.0 to 15.10.0 ([6ab97aa](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6ab97aaa89c093aa2b91e84dc91131726198dc50))
* **deps-dev:** bump rimraf from 4.1.2 to 5.0.1 ([860bdbc](https://github.com/jvandenaardweg/homewizard-energy-api/commit/860bdbcce0a1d48689444cfc8fb227452c28b975))
* **deps-dev:** bump tsconfig-paths from 4.1.2 to 4.2.0 ([c2afccb](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c2afccbcac660f9837248c7eaf14eda86efb578b))
* **deps-dev:** bump typescript from 4.9.5 to 5.0.3 ([30edb9e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/30edb9eb97b1ac9755f36422ba4c7ac3aa7887d7))
* **deps-dev:** bump typescript from 5.0.3 to 5.1.6 ([d6328ad](https://github.com/jvandenaardweg/homewizard-energy-api/commit/d6328ad47a6283bd291526d0a09c75ac256874ab))
* **deps-dev:** bump vitest from 0.28.5 to 0.29.2 ([40f3a59](https://github.com/jvandenaardweg/homewizard-energy-api/commit/40f3a593c89847afb8b8e057edfea9837e6541ab))
* **deps-dev:** bump word-wrap from 1.2.3 to 1.2.4 ([7594957](https://github.com/jvandenaardweg/homewizard-energy-api/commit/759495725bab198ccbcee176466bba4c68ae0fc9))
* **deps:** bump date-fns from 2.29.3 to 2.30.0 ([8939646](https://github.com/jvandenaardweg/homewizard-energy-api/commit/89396464f10cb841a482fe0339d7f9c6fde2f053))
* **deps:** bump undici from 5.20.0 to 5.22.1 ([0dc713a](https://github.com/jvandenaardweg/homewizard-energy-api/commit/0dc713a1f0509fe5f40855bda7ad834ca27db8b7))
* **deps:** bump vm2 from 3.9.13 to 3.9.17 ([2c2d08d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2c2d08dc2f11dfd2ed984ccaf0fe854c10f4f201))
* **deps:** bump vm2 from 3.9.17 to 3.9.19 ([a790180](https://github.com/jvandenaardweg/homewizard-energy-api/commit/a790180c10ba2e2ba8a4e9599a0031f937773d2a))
* **deps:** bump yaml from 2.1.3 to 2.2.2 ([dbfb7c3](https://github.com/jvandenaardweg/homewizard-energy-api/commit/dbfb7c3f7835eb3da8c10abf4b0f37dfe5282b14))


## [1.4.2](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.4.1...1.4.2) (2023-03-01)


### Other Changes

* **deps-dev:** bump @typescript-eslint/eslint-plugin ([abf4e6a](https://github.com/jvandenaardweg/homewizard-energy-api/commit/abf4e6aeefe2bf844ea69ec6ef2e09494a9a8c0d))
* **deps-dev:** bump @typescript-eslint/parser from 5.51.0 to 5.52.0 ([ccb2d29](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ccb2d299562e70cfc66f9b8c8fe85116d0c5bc12))
* **deps-dev:** bump @vitest/coverage-istanbul from 0.28.4 to 0.28.5 ([17c1f6c](https://github.com/jvandenaardweg/homewizard-energy-api/commit/17c1f6cbbf4b7a538500e053da5bc5822a7f8467))
* **deps-dev:** bump eslint from 8.33.0 to 8.34.0 ([0719de1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/0719de10eb0ff63889fb7a54926488ed87d374e5))
* **deps-dev:** bump lint-staged from 13.1.1 to 13.1.2 ([ba59427](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ba5942765dbf60e3ba6abbe0a8a66b9dd4510e45))
* **deps-dev:** bump prettier from 2.8.3 to 2.8.4 ([de1c20d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/de1c20dd9dc509c51092228ed2185504f489d430))
* **deps-dev:** bump resolve-tspaths from 0.8.3 to 0.8.8 ([daebe43](https://github.com/jvandenaardweg/homewizard-energy-api/commit/daebe430a562c429eb35626b8e8a858849ab9235))
* **deps-dev:** bump vitest from 0.28.4 to 0.28.5 ([a0e7985](https://github.com/jvandenaardweg/homewizard-energy-api/commit/a0e7985cc8e59d99921fb1d3618c96148118a8b2))
* **deps:** bump cacheable-request from 10.2.3 to 10.2.7 ([780327b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/780327baf77c7e7ac96d90c8607120043b63d94f))
* **deps:** bump undici from 5.18.0 to 5.19.1 ([7ec18b0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/7ec18b03ad7cc0727124d0971f21453832c86e6b))
* only run test coverage report in console ([4252bf6](https://github.com/jvandenaardweg/homewizard-energy-api/commit/4252bf660d6b2925e6a1c08f9f535614e90e15f4))
* run dependabot monthly ([df9a51d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/df9a51dadb2e4cb3c89cd5b216b331e354d47980))
* update dependencies ([1b969d1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/1b969d1d5bf317bc12f0b3ed4364d82e283a6152))


## [1.4.1](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.4.0...1.4.1) (2023-02-07)


### Documentation

* fix typo on firmware version ([792156f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/792156fe19f70e64e0971d2deeb3c06e09aca602))


### Other Changes

* update dependencies ([4ed4260](https://github.com/jvandenaardweg/homewizard-energy-api/commit/4ed42602efbc5225a18c6cbaa047e27d56774d99))


## [1.4.0](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.3.1...1.4.0) (2023-02-07)


### Features

* add system endpoints to kwh meter 1 and 3 phase ([b7030a6](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b7030a60f7e23c64dbebd3e973334f2aad6a9ea7))


### Other Changes

* **deps-dev:** bump @types/node from 18.11.18 to 18.11.19 ([725f97c](https://github.com/jvandenaardweg/homewizard-energy-api/commit/725f97c86b363478600984c031b440045a0145c5))
* **deps-dev:** bump @types/node from 18.11.19 to 18.13.0 ([f49f544](https://github.com/jvandenaardweg/homewizard-energy-api/commit/f49f544f531fd5fe0f49f882d4386966858c4a60))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([9076b92](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9076b92c068e055858659a14af31d518796b219f))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([155174b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/155174b3baeb803b313e0fe1ab668739d140d7b1))
* **deps-dev:** bump @typescript-eslint/parser from 5.48.2 to 5.49.0 ([ff10faa](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ff10faaa415dc09b60fca9e99ff88404103a9046))
* **deps-dev:** bump @vitest/coverage-istanbul from 0.27.2 to 0.28.1 ([16493f6](https://github.com/jvandenaardweg/homewizard-energy-api/commit/16493f6ff4aa414f24fdd79f9a68725a1309a952))
* **deps-dev:** bump dotenv-cli from 6.0.0 to 7.0.0 ([ee5947d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ee5947dfbfe3d93fbb1caae2efc79b316b29e984))
* **deps-dev:** bump eslint from 8.32.0 to 8.33.0 ([7568a77](https://github.com/jvandenaardweg/homewizard-energy-api/commit/7568a772ae08317acf7775784f1754c61ef9efce))
* **deps-dev:** bump rimraf from 4.1.1 to 4.1.2 ([71572c1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/71572c174e9f9df53a411990467f1e78c5eb437a))
* **deps-dev:** bump vitest from 0.27.2 to 0.28.1 ([7dab736](https://github.com/jvandenaardweg/homewizard-energy-api/commit/7dab736eecb473bdce7085abbb55691a76b16226))
* **deps-dev:** bump vitest from 0.28.1 to 0.28.3 ([9fc3c7b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9fc3c7bf3e6e19d2caad1313e768f349ff57b28c))
* **deps-dev:** bump vitest from 0.28.3 to 0.28.4 ([94d74b9](https://github.com/jvandenaardweg/homewizard-energy-api/commit/94d74b95e8ce101f6b5b95ef4125d7a17229480d))
* **deps:** bump http-cache-semantics from 4.1.0 to 4.1.1 ([0373321](https://github.com/jvandenaardweg/homewizard-energy-api/commit/03733216d8350b78e77d2e7db42f585ca8771fec))
* **deps:** bump undici from 5.15.0 to 5.16.0 ([ea78744](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ea7874464a42943dc589e4bcf2d072792a111447))
* **deps:** bump undici from 5.16.0 to 5.18.0 ([1ea1af0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/1ea1af0ba7001b8d2dc4c78af6e1e93b14f16067))


## [1.3.1](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.3.0...1.3.1) (2023-01-18)


### Documentation

* update docs on external data type ([e870827](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e870827c0d730e5387f4119ae3c5e55ac4a047f1))


### Other Changes

* added p1 meter mock data ([978f283](https://github.com/jvandenaardweg/homewizard-energy-api/commit/978f2834bf86bb28b560117e93519db320b7d7ab))
* **deps-dev:** bump eslint from 8.31.0 to 8.32.0 ([6b968c0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6b968c0f06b0c91691b517d693b4a99627e4f44d))
* **deps-dev:** bump prettier from 2.8.2 to 2.8.3 ([45ac27b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/45ac27b2d2f7230b1e21f3b86e581a3cdd20ed28))
* **deps-dev:** bump rimraf from 4.0.4 to 4.0.7 ([e7f629b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e7f629b82d4f400935457a3f6586665ae927bd5d))
* remove unique_gas_idtype , prefer gas_unique_id ([e2c717d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e2c717d76a9fda285af2eea746f6f4ebe19564be))
* update dependencies ([b8da03c](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b8da03c125ab7327e1b2f2ee90d69f662cba8ab4))


## [1.3.0](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.2.2...1.3.0) (2023-01-13)


### Features

* added support for /identify and /system endpoints for p1 meter ([5867957](https://github.com/jvandenaardweg/homewizard-energy-api/commit/5867957d6d7176f69b69019c96825569e7ae417e))
* update types using updated docs ([c0014d5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c0014d5b661fdad7452bf86d01f2424b1d4f7494))


### Other Changes

* added tests for new /system and /identify p1 meter endpoints ([0a36d88](https://github.com/jvandenaardweg/homewizard-energy-api/commit/0a36d88e6f2714797cf887ff604af156a2e0a3e8))
* **deps-dev:** bump @types/node from 18.11.17 to 18.11.18 ([e159015](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e1590151ce12efcd34f1b623733eed189ff782c7))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([d0f23c7](https://github.com/jvandenaardweg/homewizard-energy-api/commit/d0f23c71c456574bc66e5fce9723422617ddf5a9))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([4fedd77](https://github.com/jvandenaardweg/homewizard-energy-api/commit/4fedd77b55f177d405585f74ee0b0b95678c2c93))
* **deps-dev:** bump @typescript-eslint/parser from 5.47.0 to 5.47.1 ([e60f4f9](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e60f4f965e2c728019c631367ebcea5aade51655))
* **deps-dev:** bump @typescript-eslint/parser from 5.47.1 to 5.48.0 ([146851e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/146851eaf03829fef5969f4add40a6af9fc9e7e6))
* **deps-dev:** bump @vitest/coverage-istanbul from 0.26.0 to 0.26.2 ([b6c4d2d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b6c4d2dcdbf5e255259b92182a7caf2ccf1018b7))
* **deps-dev:** bump @vitest/coverage-istanbul from 0.26.2 to 0.26.3 ([a9f7337](https://github.com/jvandenaardweg/homewizard-energy-api/commit/a9f7337263cbea08ace43372c885f4c173124cdb))
* **deps-dev:** bump @vitest/coverage-istanbul from 0.26.3 to 0.27.0 ([98c23c2](https://github.com/jvandenaardweg/homewizard-energy-api/commit/98c23c27762bf2cfdbbd5948b699be4b7c5492c0))
* **deps-dev:** bump eslint from 8.30.0 to 8.31.0 ([0b2554b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/0b2554b798ac215312fdd40fa937da5f773b1454))
* **deps-dev:** bump prettier from 2.8.1 to 2.8.2 ([b1eecf7](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b1eecf76ca6133094ee703944bbe741cceabf962))
* **deps-dev:** bump release-it from 15.5.1 to 15.6.0 ([78d7ac4](https://github.com/jvandenaardweg/homewizard-energy-api/commit/78d7ac475ddedb9ad8d9d59fbadd961127756703))
* **deps-dev:** bump tsconfig-paths from 4.1.1 to 4.1.2 ([f09b773](https://github.com/jvandenaardweg/homewizard-energy-api/commit/f09b7731c8e26a6225f3e3d677dc917770c88edd))
* **deps-dev:** bump vitest from 0.26.3 to 0.27.0 ([b86887f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b86887f10f0b2ff105ee7a9d5e13e616e71ab2ac))
* extend tests on base api ([f4d7477](https://github.com/jvandenaardweg/homewizard-energy-api/commit/f4d7477832ac02bdacd497348e29f16992768aa4))
* include all coverage ([98ad082](https://github.com/jvandenaardweg/homewizard-energy-api/commit/98ad08232c991ac41b024fcb1808f42cfcdafb2d))
* simpler api mocking ([0a6cd9c](https://github.com/jvandenaardweg/homewizard-energy-api/commit/0a6cd9cf5a006e2a77de85ac911ee32d8e2503f9))
* up the test coverage ([e81120d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e81120d6b222d092373d375d69ed36a78de1c475))
* update dependabot.yml ([c7dc1cc](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c7dc1cced85ac7b4abe0e46b63318618b20ed835))
* update dependencies ([5c6a019](https://github.com/jvandenaardweg/homewizard-energy-api/commit/5c6a019fdbd1c0b577de6506c6be1d8d4bbee7a3))
* update dependencies ([ebfbb0b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ebfbb0b381dd64153c4f2d36066e6df58d875259))
* update docs on types ([9adb101](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9adb1018941816499921c2d3afb7c18a324363bb))
* update issue templates ([badf0a5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/badf0a5067cf3c133f176604453296f0a1469c32))
* update issue templates ([044496f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/044496f751f5a4fb493ccc79fd587377004025a4))
* update mock data with new types ([0b57e55](https://github.com/jvandenaardweg/homewizard-energy-api/commit/0b57e552cd1ca3aa65fd7938c178e677e8486d19))


## [1.2.2](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.2.1...1.2.2) (2022-12-21)


### Features

* expose getParsedTelegram to polling ([3ae639f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/3ae639feb251b233304d14ba3b79e487a0a9c9de))


### Documentation

* update docs on types ([245ef10](https://github.com/jvandenaardweg/homewizard-energy-api/commit/245ef10a0825767dd570411f2c83104229204af1))


### Other Changes

* **deps-dev:** bump @types/node from 18.11.15 to 18.11.17 ([03b7939](https://github.com/jvandenaardweg/homewizard-energy-api/commit/03b793993f029475db13c20ccb9054a0a5ca364c))
* **deps-dev:** bump @vitest/coverage-istanbul from 0.25.8 to 0.26.0 ([43ff9b0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/43ff9b028d05e6762b51c1ed895884cb1a5cdc09))
* **deps-dev:** bump eslint from 8.29.0 to 8.30.0 ([875d63d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/875d63dd22f6f582591d8161b2d8ff371d4f1098))
* **deps-dev:** bump vitest from 0.25.8 to 0.26.0 ([36b46f9](https://github.com/jvandenaardweg/homewizard-energy-api/commit/36b46f93281300e4569fe528336f0812c28df2f7))
* remove console log ([94de1fa](https://github.com/jvandenaardweg/homewizard-energy-api/commit/94de1fab43e46b1d5c0c06d2040b84336432b7b1))
* remove credits from changelog ([b41d401](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b41d401d85b88b40164a7c1b5e8483b504f4a048))
* up the test coverage for discovery ([b61ffde](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b61ffdeed5ce1e374d645b0cdeaa8f011fb724aa))
* up the test coverage on discovery ([632e086](https://github.com/jvandenaardweg/homewizard-energy-api/commit/632e0860ac417b6e15bc53e37141bd681d88a8c9))
* up the test coverage on p1 meter and water meter ([41fddde](https://github.com/jvandenaardweg/homewizard-energy-api/commit/41fdddef2ab1f8b8cdd82feed860a500a73ce65b))
* up the test coverage on water meter api ([4dc6625](https://github.com/jvandenaardweg/homewizard-energy-api/commit/4dc6625a38b9babf66060d9f250e32dc3a0f2bcc))
* update dependencies ([273f3ad](https://github.com/jvandenaardweg/homewizard-energy-api/commit/273f3ad0d8dde9094bfcb25d9a95c1f11af9e3bf))
* update shields in readme ([93d76cb](https://github.com/jvandenaardweg/homewizard-energy-api/commit/93d76cb6ac1d86473b5650ed8b48166886da3d85))
* upgrade dependencies ([d50e87f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/d50e87fe89a59fdbb7fd14b8f6490ec692c8af7a))


## [1.2.1](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.2.0...1.2.1) (2022-12-19)


### Bug Fixes

* expose polling methods for water meter properly ([8338d9a](https://github.com/jvandenaardweg/homewizard-energy-api/commit/8338d9a1b7df47d538d732aed18acb5f53a77558))


### Documentation

* update docs about polling getParsedTelegram ([640a8f2](https://github.com/jvandenaardweg/homewizard-energy-api/commit/640a8f2656da03825a199bd96aa475634146d298))


### Other Changes

* add tz environment variable ([cf0527e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/cf0527ee795317401f76f0447eec0c34f0c52487))
* fix timezone error in ci ([9d94451](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9d944513a6e1cbea3611a7d933e86776b5613a15))
* fix timezone error in ci ([db5f8c5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/db5f8c5d63da44873876b821b4718edab2bf1a97))
* fix timezone error in ci ([15ee889](https://github.com/jvandenaardweg/homewizard-energy-api/commit/15ee8891ce0b51697c69d9969229e187c6661b08))
* mock clear and run timers ([9c59325](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9c59325aeab6a9584a777054f453fa8a3c0ed5c1))
* move mock api pool to test setup ([6431388](https://github.com/jvandenaardweg/homewizard-energy-api/commit/643138829c13f04d69c3164b90201761e9a3ca9b))
* only format iso, do nothing with timezone ([5b991e5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/5b991e5cda7c525a3a182f5fda418db71d78ba36))
* remove trimming line ([2ac95d1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2ac95d194cb59059274d6074573509a227cc2f65))
* up the test coverage ([2e8a94b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2e8a94b2b25314110c21086dd059823c9b574185))
* up the test coverage on telegram ([07ec439](https://github.com/jvandenaardweg/homewizard-energy-api/commit/07ec4394e5d6cda7075a0cc4b9c7b9118d555f83))


## [1.2.0](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.1.1...1.2.0) (2022-12-18)


### Features

* add getParsedTelegram method ([f874f18](https://github.com/jvandenaardweg/homewizard-energy-api/commit/f874f18f0be427c90bb2ce64ece14970c49d8858))
* parse telegram txt to json ([e7b3ed3](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e7b3ed374a7a476d58ccf668793e5aaeebf1acf8))


### Bug Fixes

* parsing error on telegram ([221f636](https://github.com/jvandenaardweg/homewizard-energy-api/commit/221f636b2b246d073d91cc6f67d2cbe9ccae0d54))
* run emit error before stopping ([987b5ce](https://github.com/jvandenaardweg/homewizard-energy-api/commit/987b5ce645f53799eb44dc46d1d8dfbd201c97e6))


### Documentation

* add credits to telegram parser ([73895d0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/73895d073f1a6dc56aacbef435bb4c76486ad830))
* add more docs on methods ([13a44d0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/13a44d015a8e130beab9bb7eb692b69b151f5c6c))
* rename api const to their device name ([c8307e2](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c8307e29ce1629be2d881da150d2a04f12a5066a))
* update docs about getParsedTelegram ([ae2848d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ae2848dddf3d1c40e4b64807f2e493928f01b980))
* update docs about getParsedTelegram ([1df1548](https://github.com/jvandenaardweg/homewizard-energy-api/commit/1df15486db3d73eb30e3746ba40eefc6c62398b8))
* update docs about getParsedTelegram ([21b1624](https://github.com/jvandenaardweg/homewizard-energy-api/commit/21b16244d7de3af1ee87ed831ad9dde656b4139e))


### Other Changes

* add possible telegram responses as mocks ([59f23f1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/59f23f1cd79e480a9dabc00c3287004b85651819))
* better typings on apis ([af1c066](https://github.com/jvandenaardweg/homewizard-energy-api/commit/af1c0662abb3acb95fa0cca420e802f421ba954c))
* remove possible responses type ([2eb7553](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2eb7553f0d72382063cf3bec8b028cc7762c31e0))


## [1.1.1](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.1.0...1.1.1) (2022-12-17)


### Features

* expose more types ([945a323](https://github.com/jvandenaardweg/homewizard-energy-api/commit/945a323389914fd92ad128cec2063f937dd2d3ea))
* expose more types ([b2435cb](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b2435cba322eb4e9a4c566aac7661cf90fd7efbe))


### Documentation

* fix typo in readme ([13e7838](https://github.com/jvandenaardweg/homewizard-energy-api/commit/13e783878a180409d3c8adf6436c15e6eb2add21))


### Other Changes


## [1.1.0](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.0.2...1.1.0) (2022-12-17)


### Features

* poll data and state endpoints ([398d05c](https://github.com/jvandenaardweg/homewizard-energy-api/commit/398d05c2053fb189ce5fd81559c45a6645ea9952))
* support telegram endpoint for polling ([3671ab5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/3671ab59b890aa569de6c0071379ec6c74d4b03c))


### Documentation

* add telegram response type docs ([1485c5a](https://github.com/jvandenaardweg/homewizard-energy-api/commit/1485c5a21c48ae02e863c31d1dfa3cc7e7b22784))
* update docs on polling ([7e34635](https://github.com/jvandenaardweg/homewizard-energy-api/commit/7e3463537afccade23416f0520de1874f07816ee))
* update readme ([54cc2ad](https://github.com/jvandenaardweg/homewizard-energy-api/commit/54cc2ad0c9353e2b6bb22053145e528a914d94f5))
* update readme ([9715d56](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9715d560325a192e719da8e3dd310dc0ef26c950))


### Other Changes

* correctly show exposesd methods as method instead of const ([5ff3bec](https://github.com/jvandenaardweg/homewizard-energy-api/commit/5ff3becb867d67be16bfe6c149f9c69819783323))
* remove polling basic endpoint, no use case ([6321cc4](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6321cc4206cbbd1c6649ea79285a4e73f5e1eae6))
* remove zod ([3cdcbf6](https://github.com/jvandenaardweg/homewizard-energy-api/commit/3cdcbf665ef755a913e9073c55be012acc344076))
* update docs and examples ([988a08a](https://github.com/jvandenaardweg/homewizard-energy-api/commit/988a08ae064dfbd7cccdf736693a00bf61fae693))
* update readme ([fafad61](https://github.com/jvandenaardweg/homewizard-energy-api/commit/fafad61a1fa5ccbb5a88c0d5ccd47c2d81a06294))
* update readme ([dba9927](https://github.com/jvandenaardweg/homewizard-energy-api/commit/dba9927055f6af61bbf54b9ae62cce73b8ee24ce))
* update readme about polling ([46bf3e8](https://github.com/jvandenaardweg/homewizard-energy-api/commit/46bf3e84f64898fe960cb81827ccaab72e4d0068))
* update readme about polling ([e3c427d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e3c427ddd8bbae8f8b9d2bbaf5925ea878f8eab5))
* update readme on defaults ([66b2392](https://github.com/jvandenaardweg/homewizard-energy-api/commit/66b2392f5233d32ea504e26a89d365bd5bd37631))


## [1.0.2](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.0.1...1.0.2) (2022-12-16)


### Other Changes

* update readme ([c9a7392](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c9a739231ccc9fe3d237c5a292e128f1dee89cfb))
* update readme ([79c8de5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/79c8de597d57c481d103167e98a7966b5cb95eed))


## [1.0.1](https://github.com/jvandenaardweg/homewizard-energy-api/compare/1.0.0...1.0.1) (2022-12-16)


### Other Changes

* add badges to readme ([1814e8e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/1814e8ef31e8689ade101c325f20682bd2c48ade))
* add buffer util test ([37d7a8d](https://github.com/jvandenaardweg/homewizard-energy-api/commit/37d7a8db56c2ff17c29913f82ba4a75fb480493d))
* add changelog ([ae4c666](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ae4c666a42baa3462b98a27c73aa711c493e7868))
* add github actions badge to readme ([ddc74ba](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ddc74ba65d303ac5524534e2a4dfa337cd498653))
* export all types ([9c5d12f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9c5d12f54fade829ef747bcc0991efeef0bb0404))
* rename Base to BaseApi ([ab44cc3](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ab44cc3b7907e56abaea277bbb33500f678c4c0e))
* up the test coverage on discovery ([cb5d188](https://github.com/jvandenaardweg/homewizard-energy-api/commit/cb5d188a03481ca53406720cb79ecf1cd2e796f6))
* update eslintrc ([b7a90bc](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b7a90bc7b7a61efd05a4532afa699d8710568004))
* update mocks ([5ac5e2f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/5ac5e2f4657f0bec33811235e146a469c27f63a2))
* update readme ([351cdfa](https://github.com/jvandenaardweg/homewizard-energy-api/commit/351cdfafda8f0e1d8192b710c4d0580f462fa4e6))


## 1.0.0 (2022-12-16)


### Features

* add support for kwh meters ([907f268](https://github.com/jvandenaardweg/homewizard-energy-api/commit/907f26820c61ba9f391aef8479d157c4f62950f8))
* basic implementation of api for devices ([5b191cd](https://github.com/jvandenaardweg/homewizard-energy-api/commit/5b191cd31f598e2567c400b0e921aaedacb99863))
* make options optional ([e28c626](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e28c6264a5b65531d43720eaccad375bb85a9121))
* use multicast-dns to discover devices on local network ([7c2c1ce](https://github.com/jvandenaardweg/homewizard-energy-api/commit/7c2c1ceeb058471e88052eda9f15d7c3499eb42f))


### Documentation

* update docs on types ([2e09253](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2e0925339cd75e08424ac0c84581f33e4afff742))


### Other Changes

* add docs about discovery ([18d3353](https://github.com/jvandenaardweg/homewizard-energy-api/commit/18d3353ef731d9cc911bd2b3ae84968136abdc1a))
* add more error mocks ([15f25f0](https://github.com/jvandenaardweg/homewizard-energy-api/commit/15f25f01e5d96192fe9ddd66870fc1d27cabb715))
* better handling of mdns responses ([c8e8abb](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c8e8abb422154c117242c721acf12491e929117b))
* create codeql.yml ([9bc4830](https://github.com/jvandenaardweg/homewizard-energy-api/commit/9bc4830cc7198faf75f3af443a0c6bdc7130aa9a))
* extract buffer to json to util method ([98135ae](https://github.com/jvandenaardweg/homewizard-energy-api/commit/98135ae9c7be819c487e8f75bfa1892118f81b2e))
* fix typo in readme ([ed6f243](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ed6f2432ff58968f6e066d6d159e8f4110f67777))
* remove codeql.yml ([bbb6a38](https://github.com/jvandenaardweg/homewizard-energy-api/commit/bbb6a38e3baa70d2e774a45aa700fed397f7b1db))
* remove firmware check ([bf6365a](https://github.com/jvandenaardweg/homewizard-energy-api/commit/bf6365af15acde3114ad76bd8b1b6a8eb66357df))
* remove utils folder ([8108b40](https://github.com/jvandenaardweg/homewizard-energy-api/commit/8108b404e8a797079d6a5e6634ba16da1d8ad9e7))
* rename class const ([4c06c25](https://github.com/jvandenaardweg/homewizard-energy-api/commit/4c06c25d24412edfcc6d8df5c517157fdf01fbbd))
* rename discovery class ([b4aeecc](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b4aeecc73439ba28b68ec7810a55a70a0db74e42))
* up the coverage ([e5c55ff](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e5c55ff3fe130e61b9c07715419bd21dc4de5657))
* update docs ([15f6084](https://github.com/jvandenaardweg/homewizard-energy-api/commit/15f6084fd10b4685cd2e782de4e81e0612cdaeda))
* update mocks ([5c04193](https://github.com/jvandenaardweg/homewizard-energy-api/commit/5c04193094f2f58a166e3b5a5d325e063c4d5431))
* update readme ([cc795f4](https://github.com/jvandenaardweg/homewizard-energy-api/commit/cc795f4feb13eba7bf64e8d3b2a569cdc9779de5))
* update readme ([b86082e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/b86082eba278f2ee78b4af40aeaeddb26f08c585))
* update readme ([ea43e5c](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ea43e5ceee8b2e17b9aff2e039c89523d48fd1cc))
* update readme ([f12fef1](https://github.com/jvandenaardweg/homewizard-energy-api/commit/f12fef1989f3032dc21a1c8b59e0844246d9c928))
* update readme ([c8cf770](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c8cf7703b61d7974862fb1a121d8bd1b7d1d5fc8))
* update readme ([ada6a4f](https://github.com/jvandenaardweg/homewizard-energy-api/commit/ada6a4fcea402a0cd4ec0d99512f53d2b9ea6f9b))
* update readme ([c3e4976](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c3e49764892441dd24087b388896bf4acac85a7e))
* update readme ([2d537f5](https://github.com/jvandenaardweg/homewizard-energy-api/commit/2d537f565be1fe312a60762f961cd7425bf2c2fe))
* update readme ([555b5e7](https://github.com/jvandenaardweg/homewizard-energy-api/commit/555b5e74c8684f1b1309229afc1e6988fadece1e))
* update readme ([1a7876c](https://github.com/jvandenaardweg/homewizard-energy-api/commit/1a7876cca05381bb36f89d07c9608ffc45aaded4))
* update readme ([78020ed](https://github.com/jvandenaardweg/homewizard-energy-api/commit/78020ed0531f1a43419b34db0ae5926a2e6967b1))
* update readme ([816af1b](https://github.com/jvandenaardweg/homewizard-energy-api/commit/816af1b6c05c11979cb427d6038b0a9921920ed6))
* update readme ([6e9185e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/6e9185e0fd6db4619b40f2b67d08820d2a1a6bdc))
* update readme ([e9fd22e](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e9fd22e7fe0728596b0f46d1385e5e9c81c2df88))
* update readme ([04b65f6](https://github.com/jvandenaardweg/homewizard-energy-api/commit/04b65f6a655a3be6de8e12d862c1a3dad028c9b3))
* update readme ([e83c324](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e83c324daba4b476128c2d6ab35183082a911e90))
* update readme ([18999fc](https://github.com/jvandenaardweg/homewizard-energy-api/commit/18999fcf1b4abe1d9a521e86a6500a80d473a8ac))
* update readme ([08f45cf](https://github.com/jvandenaardweg/homewizard-energy-api/commit/08f45cf48bfdb567bd9106982b81d2432ed0366b))
* update readme ([50308ed](https://github.com/jvandenaardweg/homewizard-energy-api/commit/50308ed3db9418bcb0305263befd23c44e61b71f))
* update requirements ([c137eaf](https://github.com/jvandenaardweg/homewizard-energy-api/commit/c137eaf88cda621d6b45ad9d8471eb33a2a49d87))
* update tsconfig ([e654371](https://github.com/jvandenaardweg/homewizard-energy-api/commit/e654371d2a0c9bcd33da7da65f9bef73881e3df6))
* update types ([29f8162](https://github.com/jvandenaardweg/homewizard-energy-api/commit/29f81626da2053507475ca0c7d7a775815088de7))
* use updateMethod instead of putMethod ([da62703](https://github.com/jvandenaardweg/homewizard-energy-api/commit/da6270333c1a7d9a5fa5cd434186b9a1c4c78383))