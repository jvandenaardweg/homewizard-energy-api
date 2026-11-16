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
- Supports the HomeWizard Wi-Fi devices that have the v1 Local API
- Exposes a discovery method to discover devices on your local network using Multicast DNS
- Provides a simple polling interface to request near real-time data from your devices
- Transforms the P1 telegram text from the P1 meter into a readable detailed object
- Includes inline documentation on each method, type and property
- Follows the guidelines provided in the official [HomeWizard Energy API documentation](https://api-documentation.homewizard.com/docs/introduction)

## Installation

This library requires Node 22.19 or higher. Version 1.x supports Node 14.18 and higher. Typescript is only required for type-safety, the library will also work without Typescript.

```
npm install homewizard-energy-api
```

or

```
yarn add homewizard-energy-api
```

## Supported devices

This library supports the HomeWizard devices that have the v1 Local API:

- [Wi-Fi P1 meter](#p1-meter) `HWE-P1`
- [Wi-Fi Energy Socket](#energy-socket) `HWE-SKT`
- [Wi-Fi Watermeter](#watermeter) (Only when powered over USB) `HWE-WTR`
- [Wi-Fi kWh meter (1 phase)](#kwh-meter-1-phase) `HWE-KWH1`, `SDM230-wifi`
- [Wi-Fi kWh meter (3 phase)](#kwh-meter-3-phase) `HWE-KWH3`, `SDM630-wifi`

Make sure to enable the `Local API` setting for each device you want to use with this library. You can do this in the HomeWizard app.

The library doesn't support the v2 Local API yet. That leaves out devices that only have API v2, like the Plug-In Battery (`HWE-BAT`). HomeWizard [no longer develops API v1](https://api-documentation.homewizard.com/docs/changelog) and plans to remove it in the future, but hasn't given a date. On devices that have both, such as the P1 meter and kWh meters, API v1 can be [turned off](https://api-documentation.homewizard.com/docs/v2/system), so keep it enabled to use this library.

Each class assumes it talks to the device type it's named after and doesn't check this. For example, a `P1MeterApi` pointed at an Energy Socket returns the socket's data from `getData()`. Use `getBasicInformation()` and its `product_type`, or the discovery `txt.product_type`, to pick the right class.

## P1 Meter

Get the power consumption or gas usage in your home from the [Wi-Fi P1 Meter](https://www.homewizard.com/shop/wi-fi-p1-meter/):

```typescript
import { P1MeterApi } from 'homewizard-energy-api';

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

| Method | API              | Function                | Description                                                                                                                                                                                              |
| ------ | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                           |
| GET    | /api/v1/state    | `getState()`            | Returns the actual state of the Energy Socket. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/state).                                                                 |
| PUT    | /api/v1/state    | `updateState()`         | Control the state of the Energy Socket. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/state).                                                                        |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                     |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).             |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system). |

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

| Method | API              | Function                | Description                                                                                                                                                                                              |
| ------ | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                           |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                     |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).             |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system). |

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

| Method | API              | Function                | Description                                                                                                                                                                                              |
| ------ | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                           |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                     |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system). |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).             |

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

| Method | API              | Function                | Description                                                                                                                                                                                              |
| ------ | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api             | `getBasicInformation()` | Get basic information from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/api).                                                                           |
| GET    | /api/v1/data     | `getData()`             | Returns the most recent measurement from the device. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/measurement).                                                     |
| GET    | /api/v1/system   | `getSystem()`           | Returns the actual system settings. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system).                                                                           |
| PUT    | /api/v1/system   | `updateSystem()`        | Configure system settings. Currently the only available option it to turn on and off all cloud communication. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/system). |
| PUT    | /api/v1/identify | `identify()`            | Identify the device. The status light will blink for a few seconds after calling this endpoint. More info in the [official docs](https://api-documentation.homewizard.com/docs/v1/identify).             |

### Data polling

A simple polling interface for the kWh Meter 3-phase is exposed via `api.polling.getData`. See the [examples](https://github.com/jvandenaardweg/homewizard-energy-api/tree/main/src/examples) for more information.

## Error handling

A request that gets a non-2xx response throws a `HomeWizardEnergyApiResponseError`, which has the `url`, the `statusCode` and the raw `response` body. When the API answers with its JSON error object, the parsed `{ id, description }` is available as `apiError`, and `id` is typed as `ErrorCodes`. See the [official docs](https://api-documentation.homewizard.com/docs/v1/error-handling) for the error codes.

```typescript
import {
  EnergySocketApi,
  ErrorCodes,
  HomeWizardEnergyApiResponseError,
} from 'homewizard-energy-api';

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

### Timeouts and network errors

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

## Discover HomeWizard devices in your network

This library exposes a discovery method to discover HomeWizard Energy devices in your local network. Each HomeWizard device broadcasts itself on your local network using Multicast DNS. This allows you to use all the devices in your network without knowing the actual IP address of the device. You can find more details about this in the [official docs](https://api-documentation.homewizard.com/docs/discovery).

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

## Contributing

Bug reports, fixes and support for new endpoints or devices are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing and commit conventions.

## About this library

Hi there! I created this library to provide type-safety when using the HomeWizard Energy API's in my own projects. I made it open source so that you can easily control your HomeWizard devices and have the same level of type-safety while developing your projects.

I'm not affiliated with HomeWizard. I create open source projects in my free time. If you find this project helpful, please consider supporting me on [my GitHub Sponsor page](https://github.com/sponsors/jvandenaardweg). Your support will help me continue to create high-quality, open source projects and cover the costs of maintaining them.

Thank you for your support!

Note that logos, products, and trademarks are the property of HomeWizard.

## About HomeWizard Energy

With the HomeWizard Energy platform, you can get insights in your energy usage. Use the HomeWizard Wi-Fi P1 meter to access real-time data directly from your smart meter, the HomeWizard Wi-Fi Energy Socket to get energy insights from all your devices, the HomeWizard Wi-Fi kWh meter to measure devices such as solar panels and the HomeWizard Wi-Fi Watermeter to get insight in your water usage. With the open API you can integrate the data directly into your system of choice.

## API Introduction

The HomeWizard Wi-Fi P1 meter, Wi-Fi Energy Socket, Wi-Fi kWh meter and Wi-Fi Watermeter (‘device’) have a local API to retrieve the most recent measurements or control the device. You can access this API as long as you are connected to the same (Wi-Fi) network as the device and the API is enabled in the HomeWizard app. This API is intended to connect your device to your own automation, home automation or graphing system. It is not possible to retrieve data history with the local API, as this is not stored on the device itself.
