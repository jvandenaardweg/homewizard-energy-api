<p align="center">
  <img src="https://user-images.githubusercontent.com/5155373/208201020-4caf682b-8038-4c59-b02e-486e532aefdc.png" width="120" title="hover text">
  <h1 align="center">HomeWizard Energy API</h1>
</p>

<p align="center">
  <a href="https://npmjs.com/package/homewizard-energy-api" title="NPM package"><img alt="npm" src="https://img.shields.io/npm/v/homewizard-energy-api?color=%234c1&label=npm%20package" /></a>
  &nbsp;
  <a href="https://github.com/jvandenaardweg/homewizard-energy-api/actions" title="Build and Test result"><img alt="github" src="http://img.shields.io/github/actions/workflow/status/jvandenaardweg/homewizard-energy-api/build-and-test.yml?branch=main&color=%234c1" /></a>
  &nbsp;
  <a href="https://github.com/sponsors/jvandenaardweg" title="Sponsor me on GitHub"><img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23db61a2" alt="github sponsor" /></a>
  &nbsp;
  <a href="https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/LICENSE" title="MIT license"><img alt="mit license" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
</p>

A typed Node client for the HomeWizard Energy local API. It handles the parts of the API that take the most work to get right: pairing, certificate checks and a live connection that stays up.

Each HomeWizard device has a local API on your own network. It gives the most recent measurements and lets you change settings, without the cloud. It has no history, because the device doesn't store it.

**Contents:** [Features](#features) · [Supported devices](#supported-devices) · [Installation](#installation) · [Quick start](#quick-start) · [Recipes](#recipes) · [Reference](#reference) · [Upgrading](#upgrading)

## Features

- **Pairing in one step.** It waits for the button press on the device and gives you the credentials to store.
- **Secure by default.** It checks that each device really is the one you paired with, before your token is sent.
- **Live updates that keep working.** It reconnects after Wi-Fi drops and picks up where it left off.
- **Types for every device.** You only see what your device supports, with documentation in your editor.
- **Clear errors.** One error type tells you what went wrong, such as an expired token or an offline device.
- **Finds your devices** on the network, even after their IP address changes.
- **Reads the P1 telegram** in full, including the Belgian capacity tariff.
- **Works with older devices** that only have the API v1.

## Supported devices

| Device              | Product type              | API v2           | API v1            |
| ------------------- | ------------------------- | ---------------- | ----------------- |
| P1 meter            | `HWE-P1`                  | `P1Meter`        | ✓ (deprecated)    |
| kWh meter (1 phase) | `HWE-KWH1`, `SDM230-wifi` | `KwhMeter1Phase` | ✓ (deprecated)    |
| kWh meter (3 phase) | `HWE-KWH3`, `SDM630-wifi` | `KwhMeter3Phase` | ✓ (deprecated)    |
| Plug-In Battery     | `HWE-BAT`                 | `PlugInBattery`  |                   |
| Energy Socket       | `HWE-SKT`                 | Planned          | `EnergySocketApi` |
| Watermeter          | `HWE-WTR`                 | Planned          | `WaterMeterApi`   |

Use the API v2 where the device has it: HomeWizard [no longer develops the API v1](https://api-documentation.homewizard.com/docs/changelog) and plans to remove it. For the Energy Socket and the Watermeter, see [Energy Socket and Watermeter](#energy-socket-and-watermeter). The Watermeter only has a local API when it's powered over USB.

## Installation

```bash
npm install homewizard-energy-api
```

- It needs Node 22.19 or higher. Version 1.x supports Node 14.18.
- It works with or without TypeScript.
- The package is ESM. CommonJS code can `require()` it on Node 22.12 and later.
- The examples use top-level `await`, which needs an ES module: a `.mjs` or `.mts` file, or `"type": "module"` in your `package.json`.

## Quick start

A device only gives an app access after someone presses its button, so nobody else on your network can read or control it. That step is called pairing. You pair once, and store the credentials it returns.

```typescript
import { createFileStore, pair, P1Meter } from 'homewizard-energy-api';

const credentialsStore = createFileStore('devices.json');

let credentials = await credentialsStore.get('p1');

if (!credentials) {
  // The first run pairs: press the button on the device within 2 minutes
  credentials = await pair('192.168.1.35', 'my-app');
  await credentialsStore.set('p1', credentials);
}

const p1 = new P1Meter(credentials);
const measurement = await p1.getMeasurement();
console.log(`${measurement.power_w} W`); // -543 W: negative when the home delivers power to the grid
```

1. **Pair.** On the first run, `pair()` waits for you to press the button on the device. On the kWh meters, hold it for 1 to 3 seconds.
2. **Store.** `credentialsStore.set()` saves the credentials in `devices.json`, under the key `p1`. Give each device its own key, such as `battery`.
3. **Read.** Every run after that, `credentialsStore.get()` returns them, so your app connects without pairing again.

> [!IMPORTANT]
> The token in `devices.json` gives full access to the device. Keep the file secret, and out of version control.

More in [Storing the credentials](#storing-the-credentials). [Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/pair.ts)

## Recipes

Every recipe starts from the device you paired in the [quick start](#quick-start), and closes it at the end:

```typescript
import { createFileStore, P1Meter } from 'homewizard-energy-api';

const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: see the quick start');

const p1 = new P1Meter(credentials);

// … the recipe goes here …

await p1.close();
```

> [!IMPORTANT]
> Close the device, and each WebSocket or poller you opened, when you're done. Their open connections keep a script running. See [Closing a device](#closing-a-device).

Each recipe links to its full script in [`src/examples/`](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples). To run one from a clone of this repository, pair first with `npx tsx src/examples/pair.ts`, then run the script the same way.

### Read your energy usage

```typescript
const measurement = await p1.getMeasurement();
// {
//   energy_import_kwh: 13779.338,
//   energy_export_kwh: 0,
//   power_w: -543,
//   power_l1_w: -676,
//   external: [{ type: 'gas_meter', value: 2569.646, unit: 'm3', ... }],
//   ...
// }
```

The fields depend on the device and the smart meter: see the [full P1 meter example](https://api-documentation.homewizard.com/docs/v2/measurement#hwe-p1-full) in the HomeWizard docs, and `P1MeterMeasurement` in your editor. [Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/read-energy-usage.ts)

### Get live updates

```typescript
const socket = p1.openWebSocket();

for await (const measurement of socket.stream('measurement')) {
  console.log(measurement.power_w); // -543, each time the device pushes a measurement
}

socket.close();
```

- The stream subscribes for you, keeps going while the socket reconnects, and stops at `break`.
- When the loop is slower than the device, it skips to the newest measurement.
- It throws a `HomeWizardError` when the token is missing or rejected.

Prefer events? See [WebSocket](#websocket). [Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/live-updates.ts)

### Poll over HTTP instead

```typescript
import { poll } from 'homewizard-energy-api';

for await (const measurement of poll(() => p1.getMeasurement(), { interval: 1000 }).stream()) {
  console.log(measurement.power_w); // -543, each second
}
```

- The loop stops polling at `break`, and a failed call throws from it.
- With events, `poller.on('response', …)`, `poller.on('error', …)` and `poller.start()` keep polling through errors.
- HomeWizard advises not to poll more often than every 500 ms.

[Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/poll.ts)

### Find a device after its IP address changed

```typescript
import { connect, discover, isSameIdentifier } from 'homewizard-energy-api';

for await (const found of discover({ timeout: 10000 })) {
  if (!isSameIdentifier(found.txt.id, credentials.identifier)) continue;

  const device = connect(found, credentials);
  await credentialsStore.set('p1', { ...credentials, host: device.host }); // The next start connects straight away
  break;
}
```

Anyone on the network can announce a device, so `connect()` only accepts the device you paired with: your token is never sent anywhere else. [Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/find-device.ts)

### Handle an expired token

```typescript
import { HomeWizardError } from 'homewizard-energy-api';

try {
  await p1.getMeasurement();
} catch (error) {
  if (error instanceof HomeWizardError && error.code === 'user:unauthorized') {
    await credentialsStore.delete('p1'); // The next start pairs again, as in the quick start
  }
}
```

A token stops working when someone deletes its user on the device, or pairs again with the same name. Every error is a `HomeWizardError`, with a `kind` and the device's error `code`: see [Errors](#errors). [Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/expired-token.ts)

### Control your Plug-In Batteries

The P1 meter or kWh meter controls the batteries, so these methods are on those devices:

```typescript
const batteries = await p1.getBatteries();
console.log(batteries.mode, batteries.power_w, batteries.battery_count); // zero -404 2

await p1.updateBatteries({ permissions: ['charge_allowed'] }); // charge, but don't discharge
await p1.updateBatteries({ charge_to_full: true }); // charge to 100%, then go back
```

- **`mode`**: `zero` keeps your home at net zero, and is the default. `predictive` uses the predicted usage and energy prices, and needs the HomeWizard cloud.
- **`permissions`**: `charge_allowed` and `discharge_allowed`. An empty list allows neither.

| Needs API | What                                   |
| --------- | -------------------------------------- |
| 2.2.0     | `permissions`, `battery_count`         |
| 2.3.0     | `mode: 'predictive'`, `charge_to_full` |

Check the version with `isApiVersionAtLeast((await p1.getDevice()).api_version, '2.3.0')`. A battery's own charge is in its measurement: `(await battery.getMeasurement()).state_of_charge_pct`. [Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/batteries.ts)

### Change device settings

```typescript
await p1.updateSystem({ status_led_brightness_pct: 50 });
await p1.identify(); // blinks the status LED
```

- **`cloud_enabled: false`** makes the device work only locally: the HomeWizard app can't reach it, and it gets no firmware updates. Pairing mode or a factory reset turns the cloud on again. It's read-only on the Plug-In Battery.
- **`api_v1_enabled: false`** turns off the API v1 on the P1 meter and kWh meters, so only paired apps can reach the device.
- **`status_led_brightness_pct`** isn't available on the kWh meters.

[Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/settings.ts)

### Read the P1 telegram

```typescript
import { parseTelegram } from 'homewizard-energy-api/telegram';

const telegram = parseTelegram(await p1.getTelegram());
console.log(telegram.power.import.t1); // { value: 10830.511, unit: 'kWh' }
```

The measurement already has the parsed values; the telegram is the raw data from the smart meter. [Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/telegram.ts)

## Energy Socket and Watermeter

These devices only have the API v1 for now. It uses plain HTTP without a token: turn on the `Local API` setting for the device in the HomeWizard app.

### Switch an Energy Socket

```typescript
import { EnergySocketApi } from 'homewizard-energy-api/v1';

const socket = new EnergySocketApi('http://192.168.1.10');

await socket.updateState({ power_on: false });
```

[Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/v1/switch-energy-socket.ts)

### Get live updates from an Energy Socket

The API v1 has no WebSocket, so poll the socket instead. `poll()` works with any method, and here asks for the usage and the switch together:

```typescript
import { poll } from 'homewizard-energy-api';

const updates = poll(() => Promise.all([socket.getData(), socket.getState()]), { interval: 1000 });

for await (const [data, state] of updates.stream()) {
  console.log(state.power_on, data.active_power_w); // true 543.312, each second
}
```

The loop stops polling at `break`. [Full script](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/v1/energy-socket-live-updates.ts)

### More for the API v1

[docs/v1.md](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/docs/v1.md) has the other recipes, with a full script each: reading what an Energy Socket uses, the Watermeter, and finding the API v1 devices on your network.

## Reference

### Pairing

```typescript
const credentials = await pair('192.168.1.35', 'my-app', {
  pairTimeout: 60000, // How long to wait for the button press. Defaults to 120000 (2 minutes)
  interval: 2000, // The time between attempts. Defaults to 2000
  signal: controller.signal, // Stops the pairing when aborted
  onAttempt: remainingMs => console.log(`Press the button (${remainingMs / 1000}s left)`),
});
```

- After the button press there are 30 seconds to get the token.
- The name is 1 to 40 characters of `a-z`, `A-Z`, `0-9`, `-`, `_`, `\`, `/`, `#` and spaces. The user on the device is `local/my-app`. Pairing again with the same name gives a new token, and the old one stops working.
- The `identifier`, such as `appliance/p1dongle/5c2fafaabbcc`, is what the device's certificate is issued to. `getCertificateIdentifier(productType, serial)` builds it from the serial on the device label.
- When the button isn't pressed in time, or the pairing is aborted, `pair()` throws a `HomeWizardError` with kind `pairing` and a `reason` of `'timeout'` or `'aborted'`.

### Storing the credentials

`pair()` returns three values. Store all three, so your app can connect again after a restart without anyone walking to the device:

| Value        | Why                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token`      | It's the proof that you paired, and the device can't give it to you again. Keep it secret: it gives full access to the device.                    |
| `identifier` | The token is only sent to a device whose certificate is issued to it, and it can't be learned safely later.                                       |
| `host`       | Where to connect. When the IP address changes, [`discover()` and `connect()`](#find-a-device-after-its-ip-address-changed) find the device again. |

A credentials store keeps them per device, under a key you choose, such as `p1`. It has three methods: `get(key)`, `set(key, credentials)` and `delete(key)`. To store a new address or forget an expired token, see the recipes [Find a device after its IP address changed](#find-a-device-after-its-ip-address-changed) and [Handle an expired token](#handle-an-expired-token).

#### In a file

`createFileStore(path)` keeps the credentials in a JSON file that only its owner can read. Pair each device once, and store it under its own key:

```typescript
const credentialsStore = createFileStore('devices.json');

await credentialsStore.set('p1', await pair('192.168.1.35', 'my-app'));
await credentialsStore.set('battery', await pair('192.168.1.36', 'my-app'));
```

The file then holds an object per key:

```json
{
  "p1": {
    "host": "192.168.1.35",
    "token": "0123456789ABCDEF0123456789ABCDEF",
    "identifier": "appliance/p1dongle/5c2fafaabbcc"
  },
  "battery": { "host": "192.168.1.36", "token": "…", "identifier": "appliance/battery/…" }
}
```

On every start after that, get each device by its key. `get()` returns `undefined` for a key that isn't stored:

```typescript
const credentialsStore = createFileStore('devices.json');

const credentials = await credentialsStore.get('battery');
if (!credentials) throw new Error('Pair the battery first');

const battery = new PlugInBattery(credentials);
```

The file store replaces the file in one step, so a crash or a power loss never leaves half a file, and the calls on one file take turns within a process.

#### In your platform's storage

On a platform with its own storage, such as the config of a Homebridge or Node-RED plugin, a keychain or a secret manager, implement the `CredentialsStore` interface:

```typescript
const credentialsStore: CredentialsStore = {
  get: async key => config.devices[key],
  set: async (key, credentials) => {
    config.devices[key] = credentials;
  },
  delete: async key => {
    delete config.devices[key];
  },
};
```

#### In environment variables

On a server or in a container, you can skip the store and pass the values in. Pair once with a script, and put the values in the environment:

```typescript
const p1 = new P1Meter({
  host: process.env.HOMEWIZARD_HOST!,
  token: process.env.HOMEWIZARD_TOKEN!,
  identifier: process.env.HOMEWIZARD_IDENTIFIER!,
});
```

#### In tests

`createMemoryStore()` has the same methods, and keeps the credentials in memory until the process ends:

```typescript
const credentialsStore = createMemoryStore();
await credentialsStore.set('p1', credentials);
```

The library never logs the token. To revoke a token, delete its user with `users.delete('local/my-app')`.

### Methods per device

| Method                                | `P1Meter` | `KwhMeter1Phase`, `KwhMeter3Phase` | `PlugInBattery` |
| ------------------------------------- | --------- | ---------------------------------- | --------------- |
| `getDevice()`                         | ✓         | ✓                                  | ✓               |
| `getMeasurement()`                    | ✓         | ✓                                  | ✓               |
| `getSystem()`, `updateSystem()`       | ✓         | ✓                                  | ✓               |
| `users.list()`, `users.delete(name)`  | ✓         | ✓                                  | ✓               |
| `openWebSocket()`                     | ✓         | ✓                                  | ✓               |
| `identify()`                          | ✓         |                                    | ✓               |
| `reboot()`                            | ✓         | ✓                                  |                 |
| `getTelegram()`                       | ✓         |                                    |                 |
| `getBatteries()`, `updateBatteries()` | ✓         | ✓                                  |                 |

Each class also has a static `pair()`, which returns `{ device, credentials }`, and `close()` to close its connections. The [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) show each device.

### Connection options

```typescript
const p1 = new P1Meter(credentials, { timeout: 3000, logger: { method: console.log } });
```

| Option       | Description                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `timeout`    | The time in milliseconds until the response headers arrive, including connecting. Defaults to `5000`. `0` turns it off.       |
| `logger`     | `{ method, prefix }`, for example `{ method: console.log }`. The token is never logged.                                       |
| `retries`    | How often a read is retried after a timeout or network error, waiting 500 ms, then 1 s. Defaults to `2`. `0` turns it off.    |
| `insecure`   | Skips all certificate checks, so any device at this address is accepted, and the identifier may be empty. For debugging only. |
| `dispatcher` | Your own undici dispatcher, for example a `MockAgent` in tests. It replaces the certificate checks.                           |
| `ca`         | The CA certificate (PEM) the device's certificate must be signed by. Defaults to the HomeWizard CA.                           |

With a `logger`, a device logs once when it answers with a newer API version than the 2.3.0 these types follow. It keeps working, but the fields added since aren't typed yet.

### Closing a device

A device keeps its HTTPS connections open for the next request. Close what you opened when you're done, so a script can exit:

```typescript
const socket = p1.openWebSocket();
const poller = poll(() => p1.getMeasurement());
poller.start();

// …

socket.close(); // Each WebSocket you opened
poller.stop(); // Each poller you started
await p1.close();
```

### WebSocket

The topics are `measurement`, `system`, `device`, `user`, and on the P1 meter and kWh meters `batteries`. `system` only pushes `cloud_enabled` and `status_led_brightness_pct`, and `batteries` only `mode`, `permissions` and `target_power_w`.

```typescript
const socket = p1.openWebSocket({
  reconnect: true, // Connect again after a drop. Defaults to true
  reconnectDelay: 1000, // The first delay before connecting again; it doubles after each failed attempt. Defaults to 1000
  maxReconnectDelay: 30000, // Defaults to 30000
  heartbeatInterval: 30000, // When silent this long, ask the device for data; twice this long, reconnect. Defaults to 30000
});

socket.on('measurement', measurement => console.log(measurement.power_w));
socket.on('error', error => console.error(error));
socket.subscribe('measurement');

socket.request('system'); // the current data once, as the event of that topic
socket.set('system', { status_led_brightness_pct: 50 }); // the same fields as updateSystem() and updateBatteries()
socket.identify(); // on the P1 meter and Plug-In Battery
socket.close();
```

Commands sent before the connection is authorized wait until it is. A rejected token is reported as an `error` with code `user:unauthorized`, and then the socket stops reconnecting. [Full script with events](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/src/examples/websocket.ts)

### Errors

| `kind`        | When                                                                                                | Fields                                  |
| ------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `response`    | The device answered with an error status, or with a body that isn't valid JSON                      | `code`, `url`, `statusCode`, `response` |
| `timeout`     | The device didn't answer within the `timeout` option                                                | `url`, `timeout`                        |
| `network`     | The connection failed, for example because the device is offline                                    | `url`, `cause`                          |
| `certificate` | The certificate isn't from HomeWizard, or is issued to another identifier, so the token wasn't sent | `url`, `cause`                          |
| `pairing`     | The button wasn't pressed in time, or the pairing was aborted                                       | `reason`                                |
| `socket`      | The WebSocket failed, or the device sent an error over it                                           | `code`, `cause`                         |
| `storage`     | A credentials store couldn't read or write its file, or the file isn't one it wrote                 | `path`, `cause`                         |
| `invalid`     | The arguments or options can't work, for example a missing host or an `http://` host                |                                         |

- `connect()` also throws `certificate` for a device announced with another identifier than the stored one.
- In TypeScript, checking `kind` narrows the fields: after `error.kind === 'response'`, `error.statusCode` is a number.
- See the [HomeWizard docs](https://api-documentation.homewizard.com/docs/v2/error-handling) for the error codes.

### Entry points

| Import                           | What it has                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| `homewizard-energy-api`          | The API v2: the device classes, pairing, discovery and errors  |
| `homewizard-energy-api/v1`       | The API v1 classes, for the Energy Socket and the Watermeter   |
| `homewizard-energy-api/telegram` | `parseTelegram()`, which parses the raw telegram of a P1 meter |

## Upgrading

Coming from 2.x? The API v1 classes didn't change, but moved to their own entry point:

```typescript
import { P1MeterApi } from 'homewizard-energy-api/v1';
```

[docs/upgrading.md](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/docs/upgrading.md) has the other changes in 3.0, and how to move from the API v1 to the API v2.

## Contributing

Bug reports, fixes and support for new endpoints or devices are welcome. See [CONTRIBUTING.md](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/CONTRIBUTING.md) for setup, testing and commit conventions.

## About

I maintain this library in my free time, and I'm not affiliated with HomeWizard; its logos, products and trademarks are its own. If the library helps you, consider [sponsoring me on GitHub](https://github.com/sponsors/jvandenaardweg).
