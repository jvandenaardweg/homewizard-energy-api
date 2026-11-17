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

Full type-safe implementation of the HomeWizard Energy local API in Node. Read and control your HomeWizard devices on your own network, over the API v2 with HTTPS, pairing and a WebSocket, or over the API v1.

## Features

- Complete type-safety on all API methods, responses, and errors
- The API v2: pairing with the button on the device, HTTPS with certificate checks, and a WebSocket that pushes updates
- The API v1 under `homewizard-energy-api/v1`, for the devices that don't have the API v2 yet
- Discovers the devices on your network using Multicast DNS
- Async iterators for discovery and the WebSocket, next to the events
- Turns the P1 telegram text into a detailed object, including the Belgian capacity tariff
- Includes inline documentation on each method, type and property
- Follows the official [HomeWizard Energy API documentation](https://api-documentation.homewizard.com/docs/introduction)

## Installation

This library requires Node 22.19 or higher. Version 1.x supports Node 14.18 and higher. TypeScript is only required for type-safety, the library also works without it.

```bash
npm install homewizard-energy-api
```

The package is ESM. CommonJS code can still `require()` it, because Node 22.12 and later load ESM from `require()`. It has three entry points:

| Import                           | What it has                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| `homewizard-energy-api`          | The API v2: the device classes, pairing, discovery and errors  |
| `homewizard-energy-api/v1`       | The API v1 classes, for the Energy Socket and the Watermeter   |
| `homewizard-energy-api/telegram` | `parseTelegram()`, which parses the raw telegram of a P1 meter |

## Supported devices

| Device                                  | Product type              | API v2                              | API v1 (`/v1`)                                         |
| --------------------------------------- | ------------------------- | ----------------------------------- | ------------------------------------------------------ |
| P1 meter                                | `HWE-P1`                  | [`P1Meter`](#using-a-device)        | [`P1MeterApi`](#p1-meter) (deprecated)                 |
| kWh meter (1 phase)                     | `HWE-KWH1`, `SDM230-wifi` | [`KwhMeter1Phase`](#using-a-device) | [`KwhMeter1PhaseApi`](#kwh-meter-1-phase) (deprecated) |
| kWh meter (3 phase)                     | `HWE-KWH3`, `SDM630-wifi` | [`KwhMeter3Phase`](#using-a-device) | [`KwhMeter3PhaseApi`](#kwh-meter-3-phase) (deprecated) |
| Plug-In Battery                         | `HWE-BAT`                 | [`PlugInBattery`](#using-a-device)  | Not available                                          |
| Energy Socket                           | `HWE-SKT`                 | Planned by HomeWizard               | [`EnergySocketApi`](#energy-socket)                    |
| Watermeter (only when powered over USB) | `HWE-WTR`                 | Planned by HomeWizard               | [`WaterMeterApi`](#watermeter)                         |

Use the API v2 where the device has it. HomeWizard [no longer develops the API v1](https://api-documentation.homewizard.com/docs/changelog) and plans to remove it, but hasn't given a date. The Energy Socket and Watermeter only have the API v1 for now.

## Quick start

Pair once: run this, and press the button on the device when asked. On the kWh meters, hold the button for 1 to 3 seconds.

```typescript
import { pair } from 'homewizard-energy-api';

const credentials = await pair('192.168.1.35', 'my-app', {
  onAttempt: remainingMs =>
    console.log(`Press the button on the device (${Math.round(remainingMs / 1000)}s left)`),
});

// Store the credentials: { host, token, identifier, name }. The token is a secret: it gives full access to the device.
await storage.save(JSON.stringify(credentials));
```

Then create the device from the stored credentials:

```typescript
import { P1Meter } from 'homewizard-energy-api';

const p1 = new P1Meter(JSON.parse(await storage.load()));

const measurement = await p1.getMeasurement();
console.log(`${measurement.power_w} W`);
```

## API v2

The API v2 uses HTTPS and a token, and has a WebSocket that pushes updates. It is always on: there's no setting to enable in the HomeWizard app.

### Pairing

A device only gives out a token after someone presses its button, which proves they have the device. `pair()` keeps asking for a token until the button is pressed. After the press there are 30 seconds to get the token, and `pair()` asks every 2 seconds.

```typescript
const controller = new AbortController();

const credentials = await pair('192.168.1.35', 'my-app', {
  pairTimeout: 60000, // How long to wait for the button press. Defaults to 120000 (2 minutes)
  interval: 2000, // The time between attempts. Defaults to 2000
  signal: controller.signal, // Stops the pairing when aborted
  onAttempt: remainingMs => console.log(`Press the button (${remainingMs / 1000}s left)`),
});
```

`pair()` returns the credentials:

- **`host`** is the address you paired with.
- **`token`** is a secret that gives full access to the device. Store it: the device can't return it again.
- **`identifier`**, such as `appliance/p1dongle/5c2fafaabbcc`, is what the device's certificate is issued to. `pair()` reads it from the certificate, after checking that HomeWizard signed it. The device classes require it, and refuse a device whose certificate is issued to another identifier. `getCertificateIdentifier(productType, serial)` builds it from the serial on the device label.
- **`name`** is the user name on the device, with the `local/` prefix. The name you pass is 1 to 40 characters of `a-z`, `A-Z`, `0-9`, `-`, `_`, `\`, `/`, `#` and spaces. Pairing again with the same name gives a new token, and the old one stops working.

When the button isn't pressed in time, or the pairing is aborted, `pair()` throws a `HomeWizardError` with kind `pairing` and a `reason` of `'timeout'` or `'aborted'`.

### Storing the credentials

The credentials are one object, so store them as one JSON value. HomeWizard leaves storage to your app, so use what your platform offers:

- **Scripts:** environment variables, or a `.env` file that only you can read.
- **Home automation plugins** (Homebridge, Node-RED and others): the platform's config or credential store.
- **Servers:** a secret manager.

The token gives full access to the device, so keep it out of logs and version control. The library never logs it.

When the token is lost, pair again with the same name: the device gives a new token, and the old one stops working. A request with a token the device no longer knows throws a `HomeWizardError` with code `user:unauthorized`, which means it's time to pair again. To revoke a token, delete its user with `users.delete('local/my-app')`.

### Using a device

```typescript
import { P1Meter } from 'homewizard-energy-api';

const p1 = new P1Meter(credentials);

const measurement = await p1.getMeasurement();
console.log(measurement.power_w, measurement.energy_import_kwh);
```

Each class has only the methods its device supports:

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

Each class also has a static `pair()`, which returns the device and its credentials. Call `close()` when you no longer need a device.

```typescript
const { device, credentials } = await P1Meter.pair('192.168.1.35', 'my-app');
```

The second argument of the device classes has the connection options:

```typescript
const p1 = new P1Meter(credentials, { timeout: 3000, logger: { method: console.log } });
```

| Option       | Description                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `timeout`    | The time in milliseconds until the response headers arrive, including connecting. Defaults to `5000`. `0` turns it off. |
| `logger`     | `{ method, prefix }`, for example `{ method: console.log }`. The token is never logged.                                 |
| `insecure`   | Skips all certificate checks, so any device at this address is accepted, without an identifier. For debugging only.     |
| `dispatcher` | Your own undici dispatcher, for example a `MockAgent` in tests. It replaces the certificate checks.                     |

The [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) show each device.

### System settings

`getSystem()` returns the Wi-Fi network and signal strength, the uptime, and the cloud and status LED settings. `updateSystem()` changes them:

```typescript
await p1.updateSystem({ status_led_brightness_pct: 50 });
```

- **`cloud_enabled: false`** makes the device work only locally. The HomeWizard app then can't reach it, and the device gets no firmware updates, so make sure the user understands that. Pairing mode or a factory reset turns the cloud on again. It's read-only on the Plug-In Battery.
- **`api_v1_enabled: false`** turns off the API v1 on the P1 meter and kWh meters, so only paired apps can reach the device. The v1 classes stop working on that device.
- **`status_led_brightness_pct`** isn't available on the kWh meters.

### Plug-In Batteries

The P1 meter or kWh meter controls the Plug-In Batteries, so `getBatteries()` and `updateBatteries()` are on those devices, not on `PlugInBattery`:

```typescript
const batteries = await p1.getBatteries();
console.log(batteries.mode, batteries.power_w, batteries.battery_count);

// Charge, but don't discharge
await p1.updateBatteries({ permissions: ['charge_allowed'] });

// Charge all batteries to 100%, then go back to the previous mode
await p1.updateBatteries({ charge_to_full: true });
```

- **`mode`**: `zero` keeps your home at net zero, and is the default. `predictive` picks the permissions from the predicted usage and energy prices, and needs the HomeWizard cloud. `standby` and `to_full` are legacy modes: use `permissions: []` and `charge_to_full: true` instead.
- **`permissions`**: `charge_allowed` and `discharge_allowed`. They're read-only in mode `to_full`, so they can't be set in the same call as `mode: 'to_full'`. An empty list allows neither, like the legacy `standby`.

Some fields depend on the API version of the device: `permissions` and `battery_count` from 2.2.0, and `predictive` and `charge_to_full` from 2.3.0. A battery's own state of charge is in its measurement:

```typescript
const battery = new PlugInBattery(batteryCredentials);

const { state_of_charge_pct, power_w } = await battery.getMeasurement();
```

### WebSocket

The device pushes the data of the topics you subscribe to when it changes: `measurement`, `system`, `device`, `user`, and on the P1 meter and kWh meters `batteries`. `system` only pushes changes of `cloud_enabled` and `status_led_brightness_pct`, and `batteries` only of `mode`, `permissions` and `target_power_w`.

`stream()` returns a topic as an async iterator. It subscribes for you, and unsubscribes when the loop ends:

```typescript
const socket = p1.openWebSocket();

for await (const measurement of socket.stream('measurement')) {
  console.log(measurement.power_w);
}
```

The stream keeps going while the socket reconnects. It ends when you `break` the loop, its `signal` aborts (`socket.stream('measurement', { signal })`), or the socket closes for good. It throws a `HomeWizardError` with code `user:unauthorized` when the token is missing or rejected.

The events work too:

```typescript
const socket = p1.openWebSocket();

socket.on('measurement', measurement => console.log(measurement.power_w));
socket.on('error', error => console.error(error));
socket.subscribe('measurement');

// Later
socket.close();
```

- `socket.request('system')` asks for the current data once. It arrives as the event of that topic.
- `socket.set('system', { status_led_brightness_pct: 50 })` changes settings. It takes the same fields as `updateSystem()` and `updateBatteries()`.
- `socket.identify()` blinks the LED, on the P1 meter and Plug-In Battery.
- Commands sent before the connection is authorized wait until it is.

The socket reconnects after a dropped connection, subscribes again, and treats a connection that stays silent as dead. A rejected token is reported as an `error` with code `user:unauthorized`, and then it stops reconnecting. Its options:

```typescript
const socket = p1.openWebSocket({
  reconnect: true, // Connect again after a drop. Defaults to true
  reconnectDelay: 1000, // The first delay before connecting again. It doubles after each failed attempt. Defaults to 1000
  maxReconnectDelay: 30000, // Defaults to 30000
  heartbeatInterval: 30000, // When silent this long, ask the device for data; twice this long, reconnect. Defaults to 30000, 0 turns it off
});
```

### Polling

The WebSocket makes polling unnecessary, but `poll()` polls any method when you'd rather use HTTP:

```typescript
import { poll } from 'homewizard-energy-api';

const poller = poll(() => p1.getMeasurement(), { interval: 1000 });

poller.on('response', measurement => console.log(measurement.power_w));
poller.on('error', error => console.error(error));
poller.start();
```

HomeWizard advises not to request data more often than every 500ms.

### Telegram

On the P1 meter, `getTelegram()` returns the raw telegram from the smart meter. The measurement already has the parsed values, and `parseTelegram()` turns the whole telegram into a detailed object:

```typescript
import { parseTelegram } from 'homewizard-energy-api/telegram';

const telegram = parseTelegram(await p1.getTelegram());
console.log(telegram.power.import.t1, telegram.power.demand);
```

### Discovery

`discover()` finds the devices on `_homewizard._tcp`. It helps to find a paired device after its IP address changed, and `connect()` returns the class for the device at its current IP:

```typescript
import { connect, discover, P1Meter } from 'homewizard-energy-api';

for await (const found of discover({ timeout: 10000 })) {
  // { ip: '192.168.1.35', txt: { product_type: 'HWE-P1', id: 'appliance/p1dongle/5c2fafaabbcc', api_version: '2.2.0', ... }, ... }
  if (found.txt.id !== credentials.identifier) continue;

  const device = connect(found, credentials);

  if (device instanceof P1Meter) {
    // Store the new address for next time
    await storage.save(JSON.stringify({ ...credentials, host: device.host }));
  }
  break;
}
```

`discover()` runs until the loop ends, `timeout` passes or its `signal` aborts. `Discovery` has the same with events: `new Discovery()`, `start()`, `on('response', …)` and `stop()`.

Anyone on the network can announce a device, so `connect()` takes the identifier you stored at pairing, and throws for a device announced with another `id`: your token is never sent to a device you didn't pair with. To pair with a discovered device, pass its IP to `pair()`.

### Errors

The device classes, `pair()`, `connect()` and `discover()` throw a `HomeWizardError`, and the WebSocket emits one. Its `kind` says what went wrong, and `code` has the error code the device sent, such as `user:unauthorized` or `json:parameter-invalid-type:status_led_brightness_pct`. See the [official docs](https://api-documentation.homewizard.com/docs/v2/error-handling) for the codes.

```typescript
import { HomeWizardError } from 'homewizard-energy-api';

try {
  await p1.getMeasurement();
} catch (error) {
  if (error instanceof HomeWizardError && error.code === 'user:unauthorized') {
    // The token was deleted, pair again
  }
}
```

| `kind`        | When                                                                                                | Fields                                  |
| ------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `response`    | The device answered with an error status, or with a body that isn't valid JSON                      | `code`, `url`, `statusCode`, `response` |
| `timeout`     | The device didn't answer within the `timeout` option                                                | `url`, `timeout`                        |
| `network`     | The connection failed, for example because the device is offline                                    | `url`, `cause`                          |
| `certificate` | The certificate isn't from HomeWizard, or is issued to another identifier, so the token wasn't sent | `url`, `cause`                          |
| `pairing`     | The button wasn't pressed in time, or the pairing was aborted                                       | `reason`                                |
| `socket`      | The WebSocket failed, or the device sent an error over it                                           | `code`, `cause`                         |
| `invalid`     | The arguments or options can't work, for example a missing identifier or an `http://` host          |                                         |

With a `logger`, a device logs once when it answers with a newer API version than the 2.3.0 these types follow. It keeps working, because HomeWizard keeps each major version backward compatible, but the fields it added since aren't typed yet.

### Upgrading from 2.x

The API v1 classes didn't change, but moved to their own entry point. Change the import, and the rest of your code keeps working:

```typescript
// 2.x
import { P1MeterApi, HomeWizardEnergyDiscovery } from 'homewizard-energy-api';

// 3.0
import { P1MeterApi, HomeWizardEnergyDiscovery } from 'homewizard-energy-api/v1';
```

The package is ESM now, and imports of files inside `dist/` no longer work. Use the three entry points above.

The root has its own `DiscoveryResponse` and `MdnsTxtRecord` types now, for `_homewizard._tcp`, and no longer exports `MDNS_DISCOVERY_TYPE` and `MDNS_DISCOVERY_DOMAIN`. Import the v1 ones from `homewizard-energy-api/v1`.

### Moving from v1 to v2

1. Pair with the device (see [Pairing](#pairing)), instead of enabling the Local API in the HomeWizard app.
2. Create the v2 class from the credentials: `new P1Meter(credentials)` instead of `new P1MeterApi('http://192.168.1.35')`.
3. Rename the methods: `getBasicInformation()` is `getDevice()`, and `getData()` is `getMeasurement()`. `getParsedTelegram()` is gone: the measurement has the parsed values, or use `parseTelegram(await p1.getTelegram())`.
4. Replace `api.polling.<method>` with the WebSocket, or with `poll()`.
5. Rename the fields:

| API v1 (`getData()`)                                        | API v2 (`getMeasurement()`)                            |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `total_power_import_kwh`, `total_power_import_t1_kwh`, …    | `energy_import_kwh`, `energy_import_t1_kwh`, …         |
| `total_power_export_kwh`, `total_power_export_t1_kwh`, …    | `energy_export_kwh`, `energy_export_t1_kwh`, …         |
| `active_power_w`, `active_power_l1_w`, …                    | `power_w`, `power_l1_w`, …                             |
| `active_voltage_v`, `active_current_a`, …                   | `voltage_v`, `current_a`, …                            |
| `active_apparent_power_va`, `active_apparent_current_a`, …  | `apparent_power_va`, `apparent_current_a`, …           |
| `active_reactive_power_var`, `active_reactive_current_a`, … | `reactive_power_var`, `reactive_current_a`, …          |
| `active_power_factor`, `active_power_factor_l1`, …          | `power_factor`, `power_factor_l1`, …                   |
| `active_frequency_hz`                                       | `frequency_hz`                                         |
| `smr_version`                                               | `protocol_version`                                     |
| `active_power_average_w`                                    | `average_power_15m_w`                                  |
| `montly_power_peak_w`, `montly_power_peak_timestamp`        | `monthly_power_peak_w`, `monthly_power_peak_timestamp` |
| `total_gas_m3`, `gas_timestamp`                             | An item in `external` with `type: 'gas_meter'`         |
| `wifi_ssid`, `wifi_strength` (percent)                      | `getSystem()`: `wifi_ssid`, `wifi_rssi_db` (dB)        |

Timestamps are ISO 8601 strings without a timezone, such as `2024-06-28T14:12:34`, instead of numbers in the `YYMMDDhhmmss` format.

## API v1

The API v1 uses plain HTTP without a token. Import it from `homewizard-energy-api/v1`. Enable the `Local API` setting for each device in the HomeWizard app to use it. On the P1 meter and kWh meters, the API v1 can also be [turned off](#system-settings), so keep it on to use these classes.

Each class assumes it talks to the device type it's named after and doesn't check this. For example, a `P1MeterApi` pointed at an Energy Socket returns the socket's data from `getData()`. Use `getBasicInformation()` and its `product_type`, or the discovery `txt.product_type`, to pick the right class.

### P1 Meter

> [!NOTE]
> `P1MeterApi` is deprecated in favour of [`P1Meter`](#api-v2), because HomeWizard plans to remove the API v1. It keeps working while the device has the API v1 enabled.

Get the power consumption or gas usage in your home from the [Wi-Fi P1 Meter](https://www.homewizard.com/shop/wi-fi-p1-meter/):

```typescript
import { P1MeterApi } from 'homewizard-energy-api/v1';

const p1Meter = new P1MeterApi('http://192.168.1.11');

// Get the active power and gas usage
const data = await p1Meter.getData();
```

| Method | API              | Function                | Description                                                                                                                                                                                                                                   |
| ------ | ---------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                                                                |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                                                          |
| GET    | /api/v1/telegram | `getTelegram()`         | Returns the most recent, valid telegram in text format that was given by the P1 meter, therefore this endpoint is only available for the HWE-P1. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/telegram). |
| GET    | /api/v1/telegram | `getParsedTelegram()`   | Returns the telegram as a detailed JSON response. This is a feature of this library, and not of the API itself. See telegram docs for more info about the telegram endpoint                                                                   |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).                                                  |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                                                                |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                      |

#### Data polling

A simple polling interface for the P1 Meter (and all other devices) is exposed via `api.polling.getData`, `api.polling.getTelegram` and `api.polling.getParsedTelegram`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

```typescript
import { P1MeterApi } from 'homewizard-energy-api/v1';

const p1Meter = new P1MeterApi('http://192.168.1.35', {
  polling: {
    interval: 1000, // Poll the endpoints each second. Defaults to 1000
    stopOnError: true, // Will stop polling when an error occurs. Defaults to false
  },
});

p1Meter.polling.getData.start();

p1Meter.polling.getData.on('response', response => {
  // Receive the latest data of this P1 Meter from the /api/v1/data endpoint each second:
  // {
  //   smr_version: 50,
  //   meter_model: 'ISKRA 2M550T-1012',
  //   wifi_ssid: 'SOME_WIFI_SSID',
  //   wifi_strength: 100,
  //   total_power_import_t1_kwh: 19055.287,
  //   total_power_import_t2_kwh: 19505.815,
  //   total_power_export_t1_kwh: 0.002,
  //   total_power_export_t2_kwh: 0.007,
  //   active_power_w: 997,
  //   active_power_l1_w: 66,
  //   active_power_l2_w: 88,
  //   active_power_l3_w: 852,
  //   total_gas_m3: 6789.488,
  //   gas_timestamp: 221217223003
  // }
});

p1Meter.polling.getData.on('error', error => {
  // handle an error
});
```

### Energy Socket

Control your [Wi-Fi Energy Socket](https://www.homewizard.com/shop/wi-fi-energy-socket/):

```typescript
import { EnergySocketApi } from 'homewizard-energy-api/v1';

const energySocket = new EnergySocketApi('http://192.168.1.10');

// Turn the Energy Socket ON
const updatedState = await energySocket.updateState({ power_on: true });
```

| Method | API              | Function                | Description                                                                                                                                                                                              |
| ------ | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                           |
| GET    | /api/v1/state    | `getState()`            | Returns the actual state of the Energy Socket. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/state).                                                                 |
| PUT    | /api/v1/state    | `updateState()`         | Control the state of the Energy Socket. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/state).                                                                        |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                     |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).             |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system). |

#### Data polling

A simple polling interface for the Energy Sockets is exposed via `api.polling.getData` and `api.polling.getState`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

### Watermeter

Get the water consumption in your home from the [Wi-Fi Watermeter](https://www.homewizard.com/shop/wi-fi-watermeter/):

```typescript
import { WaterMeterApi } from 'homewizard-energy-api/v1';

const waterMeter = new WaterMeterApi('http://192.168.1.12');

// Get the active water usage
const data = await waterMeter.getData();
```

| Method | API              | Function                | Description                                                                                                                                                                                              |
| ------ | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                           |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                     |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).             |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system). |

#### Data polling

A simple polling interface for the Watermeter is exposed via `api.polling.getData`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

### kWh Meter 1-phase

> [!NOTE]
> `KwhMeter1PhaseApi` is deprecated in favour of [`KwhMeter1Phase`](#api-v2), because HomeWizard plans to remove the API v1. It keeps working while the device has the API v1 enabled.

Get the power consumption from the [Wi-Fi kWh meter 1-phase MID](https://www.homewizard.com/shop/wi-fi-kwh-meter-1-phase/):

```typescript
import { KwhMeter1PhaseApi } from 'homewizard-energy-api/v1';

const kwhMeter1Phase = new KwhMeter1PhaseApi('http://192.168.1.13');

// Get the power usage from your Wi-Fi kWh meter 1-phase MID
const data = await kwhMeter1Phase.getData();
```

| Method | API              | Function                | Description                                                                                                                                                                                              |
| ------ | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                           |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                     |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system). |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).             |

#### Data polling

A simple polling interface for the kWh Meter 1-phase is exposed via `api.polling.getData`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

### kWh Meter 3-phase

> [!NOTE]
> `KwhMeter3PhaseApi` is deprecated in favour of [`KwhMeter3Phase`](#api-v2), because HomeWizard plans to remove the API v1. It keeps working while the device has the API v1 enabled.

Get the power consumption from the [Wi-Fi kWh meter 3-phase MID](https://www.homewizard.com/shop/wi-fi-kwh-meter-3-phase/):

```typescript
import { KwhMeter3PhaseApi } from 'homewizard-energy-api/v1';

const kwhMeter3Phase = new KwhMeter3PhaseApi('http://192.168.1.14');

// Get the power usage from your Wi-Fi kWh meter 3-phase MID
const data = await kwhMeter3Phase.getData();
```

| Method | API              | Function                | Description                                                                                                                                                                                              |
| ------ | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                           |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                     |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system). |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).             |

#### Data polling

A simple polling interface for the kWh Meter 3-phase is exposed via `api.polling.getData`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

### Error handling

A request that gets a non-2xx response throws a `HomeWizardEnergyApiResponseError`, which has the `url`, the `statusCode` and the raw `response` body. When the API answers with its JSON error object, the parsed `{ id, description }` is available as `apiError`, and `id` is typed as `ErrorCodes`. See the [official docs](https://api-documentation.homewizard.com/docs/v1/error-handling) for the error codes.

```typescript
import {
  EnergySocketApi,
  ErrorCodes,
  HomeWizardEnergyApiResponseError,
} from 'homewizard-energy-api/v1';

const energySocket = new EnergySocketApi('http://192.168.1.10');

try {
  await energySocket.updateState({ power_on: false });
} catch (error) {
  if (
    error instanceof HomeWizardEnergyApiResponseError &&
    error.apiError?.id === ErrorCodes.PARAMETER_IS_NOT_MODIFIABLE
  ) {
    // e.g. "power_on cannot be turned off when switch_lock is on"
    console.log(error.apiError.description);
  }
}
```

A path the device doesn't know, or a method an endpoint doesn't accept, returns a 404 or 405 with a plain-text body like `Nothing matches the given URI`. `apiError` is `undefined` for those.

#### Timeouts and network errors

A request that doesn't get the response headers within 5 seconds, including the time to connect to the device, throws a `HomeWizardEnergyApiTimeoutError`. Reading the body is covered by the 2 second `requestOptions.bodyTimeout`. Change it with the `timeout` option, or set it to `0` to turn it off. It isn't used when you pass your own `requestOptions.signal`.

```typescript
const p1Meter = new P1MeterApi('http://192.168.1.35', {
  timeout: 3000, // Defaults to 5000
});
```

When the device is unreachable, the error arrives on time, but the connect attempt carries on in the background until undici's own 10 second connect timeout. In a long-running app that doesn't matter, but it can keep a short script running for those 10 seconds. To stop the connect as well, pass an undici 8 `Agent` with a matching connect timeout:

```typescript
import { Agent } from 'undici';

const p1Meter = new P1MeterApi('http://192.168.1.35', {
  timeout: 3000,
  requestOptions: {
    dispatcher: new Agent({ connect: { timeout: 3000 } }),
  },
});
```

Other network failures, like a refused connection, throw the error from [undici](https://github.com/nodejs/undici) as is. Its `code`, like `ECONNREFUSED`, tells you what went wrong.

### Discovery (API v1)

`HomeWizardEnergyDiscovery` finds the devices on `_hwenergy._tcp`, which have the API v1. Each HomeWizard device broadcasts itself on your local network using Multicast DNS. This allows you to use all the devices in your network without knowing the actual IP address of the device. You can find more details about this in the [official docs](https://api-documentation.homewizard.com/docs/discovery).

```typescript
import { HomeWizardEnergyDiscovery } from 'homewizard-energy-api/v1';

const discovery = new HomeWizardEnergyDiscovery();

discovery.start();

discovery.on('response', response => {
  // You'll get a response for each device that is found
  // Example response:
  // {
  //   ip: '192.168.1.34',
  //   hostname: 'energysocket-25FF1A.local',
  //   fqdn: 'energysocket-25FF1A._hwenergy._tcp.local',
  //   txt: {
  //     api_enabled: '1',
  //     path: '/api/v1',
  //     serial: '3c39e725ff1a',
  //     product_name: 'Energy Socket',
  //     product_type: 'HWE-SKT'
  //   }
  // }
});
```

## Contributing

Bug reports, fixes and support for new endpoints or devices are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing and commit conventions.

## About this library

Hi there! I created this library to provide type-safety when using the HomeWizard Energy API's in my own projects. I made it open source so that you can easily control your HomeWizard devices and have the same level of type-safety while developing your projects.

I'm not affiliated with HomeWizard. I create open source projects in my free time. If you find this project helpful, please consider supporting me on [my GitHub Sponsor page](https://github.com/sponsors/jvandenaardweg). Your support will help me continue to create high-quality, open source projects and cover the costs of maintaining them.

Thank you for your support!

Note that logos, products, and trademarks are the property of HomeWizard.

## About HomeWizard Energy

With the HomeWizard Energy platform, you get insight into your energy usage. The HomeWizard P1 meter reads real-time data from your smart meter, the Energy Socket measures the devices you plug into it, the kWh meter measures devices such as solar panels, the Watermeter measures your water usage, and the Plug-In Battery stores energy.

Each device has a local API to read its most recent measurements or control it, as long as you're on the same network. It's meant for your own automation, home automation or graphing system. The local API has no history, because the device doesn't store it. The API v2 needs a token from [pairing](#pairing); the API v1 needs the Local API setting in the HomeWizard app.
