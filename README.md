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

Full type-safe implementation of the HomeWizard Energy API in Node. Use the Local API of your HomeWizard devices with ease.

## Features

- Complete type-safety on all API methods, responses, and errors
- Supports all HomeWizard Wi-Fi devices that have a Local API
- Exposes a discovery method to discover devices on your local network using Multicast DNS
- Provides a simple polling interface to request near real-time data from your devices
- Transforms the P1 telegram text from the P1 meter into a readable detailed object
- Includes inline documentation on each method, type and property
- Follows the guidelines provided in the official [HomeWizard Energy API documentation](https://homewizard-energy-api.readthedocs.io/index.html)

## Installation

This library requires Node 22 or higher. Typescript is only required for type-safety, the library will also work without Typescript.

```
npm install homewizard-energy-api
```

or

```
yarn add homewizard-energy-api
```

## Supported devices

This library supports all devices from HomeWizard that expose an API. This includes:

- [Wi-Fi P1 meter](#p1-meter) `HWE-P1`
- [Wi-Fi Energy Socket](#energy-socket) `HWE-SKT`
- [Wi-Fi Watermeter](#watermeter) (Only when powered over USB) `HWE-WTR`
- [Wi-Fi kWh meter (1 phase)](#kwh-meter-1-phase) `SDM230-wifi`
- [Wi-Fi kWh meter (3 phase)](#kwh-meter-3-phase) `SDM630-wifi`

Make sure to enable the `Local API` setting for each device you want to use with this library. You can do this in the Energy app.

## P1 Meter

Get the power consumption or gas usage in your home from the [Wi-Fi P1 Meter](https://www.homewizard.com/shop/wi-fi-p1-meter/):

```typescript
import { P1MeterApi } from 'homewizard-energy-api';

const p1Meter = new P1MeterApi('http://192.168.1.11');

// Get the active power and gas usage
const data = await p1Meter.getData();
```

| Method | API              | Function              | Description                                                                                                                                                                                                                                                                 |
| ------ | ---------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasic()`          | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                                                                                                                 |
| GET    | /api/v1/data     | `getData()`           | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data).                                                                                          |
| GET    | /api/v1/telegram | `getTelegram()`       | Returns the most recent, valid telegram in text format that was given by the P1 meter, therefore this endpoint is only available for the HWE-P1. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#p1-telegram-api-v1-telegram). |
| GET    | /api/v1/telegram | `getParsedTelegram()` | Returns the telegram as a detailed JSON response. This is a feature of this library, and not of the API itself. See telegram docs for more info about the telegram endpoint                                                                                                 |
| PUT    | /api/v1/identify | `identify()`          | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#identify-api-v1-identify).                                                     |
| GET    | /api/v1/system   | `getSystem()`         | Returns the actual system settings. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system).                                                                                                                     |
| PUT    | /api/v1/system   | `updateSystem()`      | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system).                                           |

### Data polling

A simple polling interface for the P1 Meter (and all other devices) is exposed via `api.polling.getData`, `api.polling.getTelegram` and `api.polling.getParsedTelegram`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

```typescript
import { P1MeterApi } from 'homewizard-energy-api';

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

## Energy Socket

Control your [Wi-Fi Energy Socket](https://www.homewizard.com/shop/wi-fi-energy-socket/):

```typescript
import { EnergySocketApi } from 'homewizard-energy-api';

const energySocket = new EnergySocketApi('http://192.168.1.10');

// Turn the Energy Socket ON
const updatedState = await energySocket.updateState({ power_on: true });
```

| Method | API              | Function         | Description                                                                                                                                                                                                                       |
| ------ | ---------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasic()`     | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                                                                       |
| GET    | /api/v1/state    | `getState()`     | Returns the actual state of the Energy Socket. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#state-api-v1-state).                                                                  |
| PUT    | /api/v1/state    | `updateState()`  | Control the state of the Energy Socket. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#state-api-v1-state).                                                                         |
| GET    | /api/v1/data     | `getData()`      | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data).                                                |
| PUT    | /api/v1/identify | `identify()`     | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#identify-api-v1-identify).           |
| GET    | /api/v1/system   | `getSystem()`    | Returns the actual system settings. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()` | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system). |

### Data polling

A simple polling interface for the Energy Sockets is exposed via `api.polling.getData` and `api.polling.getState`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

## Watermeter

Get the water consumption in your home from the [Wi-Fi Watermeter](https://www.homewizard.com/shop/wi-fi-watermeter/):

```typescript
import { WaterMeterApi } from 'homewizard-energy-api';

const waterMeter = new WaterMeterApi('http://192.168.1.12');

// Get the active water usage
const data = await waterMeter.getData();
```

| Method | API          | Function     | Description                                                                                                                                                                        |
| ------ | ------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api         | `getBasic()` | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                        |
| GET    | /api/v1/data | `getData()`  | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data). |

### Data polling

A simple polling interface for the Watermeter is exposed via `api.polling.getData`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

## kWh Meter 1-phase

Get the power consumption from the [Wi-Fi kWh meter 1-phase MID](https://www.homewizard.com/shop/wi-fi-kwh-meter-1-phase/):

```typescript
import { KwhMeter1PhaseApi } from 'homewizard-energy-api';

const kwhMeter1Phase = new KwhMeter1PhaseApi('http://192.168.1.13');

// Get the power usage from your Wi-Fi kWh meter 1-phase MID
const data = await kwhMeter1Phase.getData();
```

| Method | API            | Function         | Description                                                                                                                                                                                                                       |
| ------ | -------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api           | `getBasic()`     | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                                                                       |
| GET    | /api/v1/data   | `getData()`      | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data).                                                |
| GET    | /api/v1/system | `getSystem()`    | Returns the actual system settings. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system).                                                                           |
| PUT    | /api/v1/system | `updateSystem()` | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system). |

### Data polling

A simple polling interface for the kWh Meter 1-phase is exposed via `api.polling.getData`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

## kWh Meter 3-phase

Get the power consumption from the [Wi-Fi kWh meter 3-phase MID](https://www.homewizard.com/shop/wi-fi-kwh-meter-3-phase/):

```typescript
import { KwhMeter3PhaseApi } from 'homewizard-energy-api';

const kwhMeter3Phase = new KwhMeter3PhaseApi('http://192.168.1.14');

// Get the power usage from your Wi-Fi kWh meter 3-phase MID
const data = await kwhMeter3Phase.getData();
```

| Method | API            | Function         | Description                                                                                                                                                                                                                       |
| ------ | -------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api           | `getBasic()`     | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                                                                       |
| GET    | /api/v1/data   | `getData()`      | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data).                                                |
| GET    | /api/v1/system | `getSystem()`    | Returns the actual system settings. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system).                                                                           |
| PUT    | /api/v1/system | `updateSystem()` | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#system-api-v1-system). |

### Data polling

A simple polling interface for the kWh Meter 3-phase is exposed via `api.polling.getData`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

## Installing this fork

This fork is not published on npm. The `dist` branch contains the built library (updated on each push to `main`), install it from GitHub:

```bash
npm install homewizard-energy-api@github:NebzHB/homewizard-energy-api#dist
```

## API v2

HomeWizard is moving its devices to the [API v2](https://api-documentation.homewizard.com/docs/category/api-v2): HTTPS, a token per application (the user has to press the button on the device once) and new names for the datapoints. Each device has a `...ApiV2` class next to its API v1 class, they work the same way (same methods, same polling interface).

| Device                               | Class                           | API v2                                                            |
| ------------------------------------ | ------------------------------- | ----------------------------------------------------------------- |
| P1 Meter `HWE-P1`                    | `P1MeterApiV2`                  | Supported                                                         |
| kWh Meter `HWE-KWH1`, `SDM230-wifi`  | `KwhMeter1PhaseApiV2`           | Supported                                                         |
| kWh Meter `HWE-KWH3`, `SDM630-wifi`  | `KwhMeter3PhaseApiV2`           | Supported                                                         |
| Plug-In Battery `HWE-BAT`            | `PlugInBatteryApiV2`            | Supported (this device has no API v1)                             |
| Energy Socket `HWE-SKT`              | `EnergySocketApiV2`             | In development by HomeWizard, common methods only                 |
| Watermeter `HWE-WTR`                 | `WaterMeterApiV2`               | In development by HomeWizard, common methods only                 |
| Energy Display `HWE-DSP`             | `EnergyDisplayApiV2`            | In development by HomeWizard, common methods only                 |
| Temperature Humidity Meter `HWE-TMP` | `TemperatureHumidityMeterApiV2` | No API yet (under exploration by HomeWizard), common methods only |

```typescript
import { P1MeterApiV2, getCertificateIdentifier } from 'homewizard-energy-api';

const p1Meter = new P1MeterApiV2('https://192.168.1.11', {
  api: {
    // Validates that the certificate is issued to this device (optional, but recommended)
    identifier: getCertificateIdentifier('HWE-P1', '5c2fafaabbcc'),
    // The token you stored earlier. Without a token, use pair() first.
    token,
  },
});

// Only once: ask the user to press the button on the device and wait for it.
// On the kWh Meter the button must be held for 1 to 3 seconds.
const { token } = await p1Meter.pair('my-app', { timeout: 120000 });

const data = await p1Meter.getData();
```

| Method | API                  | Function                               | Available on        |
| ------ | -------------------- | -------------------------------------- | ------------------- |
| POST   | /api/user            | `createUser()`, `pair()`               | All                 |
| GET    | /api/user            | `getUsers()`                           | All                 |
| DELETE | /api/user            | `deleteUser()`                         | All                 |
| GET    | /api                 | `getBasicInformation()`                | All                 |
| GET    | /api/measurement     | `getData()`                            | All                 |
| GET    | /api/system          | `getSystem()`                          | All                 |
| PUT    | /api/system          | `updateSystem()`                       | All                 |
| PUT    | /api/system/identify | `identify()`                           | All                 |
| PUT    | /api/system/reboot   | `reboot()`                             | P1 Meter, kWh Meter |
| GET    | /api/batteries       | `getBatteries()`                       | P1 Meter, kWh Meter |
| PUT    | /api/batteries       | `updateBatteries()`                    | P1 Meter, kWh Meter |
| GET    | /api/telegram        | `getTelegram()`, `getParsedTelegram()` | P1 Meter            |

Good to know:

- `pair()` keeps calling `createUser()` until the button is pressed. After the button is pressed there are 30 seconds to create the user. Creating a user with an existing name gives a new token and makes the previous one invalid.
- Errors of the API v2 are thrown as `HomeWizardEnergyApiV2ResponseError`, with the code of the device in `errorCode` (for example `user:unauthorized`).
- The certificate of the device is validated with the HomeWizard CA certificate (included). Use `api.verifyCertificate: false` to turn this off.
- Devices with the API v2 are discovered on another mDNS domain, use `new HomeWizardEnergyDiscovery({ types: ['hwenergy', 'homewizard'] })` and `isMdnsTxtRecordV2(response.txt)`.

### WebSocket

With the API v2 the device can push its data over a WebSocket, so there is no need to poll. The WebSocket uses the same token and the same validation of the certificate.

```typescript
p1Meter.websocket.on('measurement', measurement => console.log(measurement.power_w));
p1Meter.websocket.on('error', error => console.log(error));

p1Meter.websocket.subscribe('measurement'); // or 'system', 'batteries', 'device', 'user', '*'
p1Meter.websocket.start();

// later
p1Meter.websocket.stop();
```

The connection is opened again (and the subscriptions are sent again) when it is lost, see the `websocket` options (`reconnect`, `reconnectInterval` and `heartbeatInterval`). `updateSystem()`, `updateBatteries()`, `request()` and `identify()` are also available on the WebSocket.

## Discover HomeWizard devices in your network

This library exposes a discovery method to discover HomeWizard Energy devices in your local network. Each HomeWizard device broadcasts itself on your local network using Multicast DNS. This allows you to use all the devices in your network without knowing the actual IP address of the device. You can find more details about this in the [official docs](https://homewizard-energy-api.readthedocs.io/discovery.html).

### Discovery example

```typescript
import { HomeWizardEnergyDiscovery } from 'homewizard-energy-api';

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

## About this library

Hi there! I created this library to provide type-safety when using the HomeWizard Energy API's in my own projects. I made it open source so that you can easily control your HomeWizard devices and have the same level of type-safety while developing your projects.

I'm not affiliated with HomeWizard. I create open source projects in my free time. If you find this project helpful, please consider supporting me on [my GitHub Sponsor page](https://github.com/sponsors/jvandenaardweg). Your support will help me continue to create high-quality, open source projects and cover the costs of maintaining them.

Thank you for your support!

Note that logos, products, and trademarks are the property of HomeWizard.

## About HomeWizard Energy

With the HomeWizard Energy platform, you can get insights in your energy usage. Use the HomeWizard Wi-Fi P1 meter to access real-time data directly from your smart meter, the HomeWizard Wi-Fi Energy Socket to get energy insights from all your devices, the HomeWizard Wi-Fi kWh meter to measure devices such as solar panels and the HomeWizard Wi-Fi Watermeter to get insight in your water usage. With the open API you can integrate the data directly into your system of choice.

## API Introduction

The HomeWizard Wi-Fi P1 meter, Wi-Fi Energy Socket, Wi-Fi kWh meter and Wi-Fi Watermeter (‘device’) have a local API to retrieve the most recent measurements or control the device. You can access this API as long as you are connected to the same (Wi-Fi) network as the device and the API is enabled in the HomeWizard Energy app. This API is intended to connect your device to your own automation, home automation or graphing system. It is not possible to retrieve data history with the local API, as this is not stored on the device itself.
