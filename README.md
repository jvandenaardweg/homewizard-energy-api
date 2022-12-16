# HomeWizard Energy API
[![npm version](https://badge.fury.io/js/homewizard-energy-api.svg)](https://badge.fury.io/js/homewizard-energy-api) [![mit license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jvandenaardweg/homewizard-energy-api/blob/main/LICENSE)

Full type-safe implementation of the HomeWizard Energy API in Node. Use the Local API of your HomeWizard devices with ease.

## Features

- Complete type-safety on all API methods, responses, and errors
- Exposes a discovery method to discover devices on your local network using Multicast DNS
- Includes inline documentation on each method, type and property
- Follows the guidelines provided in the official [HomeWizard Energy API documentation](https://homewizard-energy-api.readthedocs.io/index.html)

## Installation
This library requires Node 14 or higher. Typescript is only required for type-safety, the library will also work without Typescript.

```
npm install homewizard-energy-api
```

or

```
yarn add homewizard-energy-api
```

## Supported devices

This library supports all devices from HomeWizard that expose an API. This includes:

- Wi-Fi P1 meter `HWE-P1`
- Wi-Fi Energy Socket `HWE-SKT`
- Wi-Fi Watermeter (Only when powered over USB) `HWE-WTR`
- Wi-Fi kWh meter (1 phase) `SDM230-wifi`
- Wi-Fi kWh meter (3 phase) `SDM630-wifi`

Make sure to enable the `Local API` setting for each device you want to use with this library. You can do this in the Energy app.

## Energy Socket

Control your [Wi-Fi Energy Socket](https://www.homewizard.com/shop/wi-fi-energy-socket/):

```typescript
import { EnergySocketApi } from 'homewizard-energy-api';

const api = new EnergySocketApi('http://192.168.1.10');

// Turn the Energy Socket ON
const updatedState = await api.updateState({ power_on: true });
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

## P1 Meter

Get the power consumption or gas usage in your home from the [Wi-Fi P1 Meter](https://www.homewizard.com/shop/wi-fi-p1-meter/):

```typescript
import { P1MeterApi } from 'homewizard-energy-api';

const api = new P1MeterApi('http://192.168.1.11');

// Get the active power and gas usage
const data = await api.getData();
```

| Method | API              | Function        | Description                                                                                                                                                                                                                                                  |
| ------ | ---------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | /api             | `getBasic()`    | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                                                                                                  |
| GET    | /api/v1/data     | `getData()`     | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data).                                                                           |
| GET    | /api/v1/telegram | `getTelegram()` | Returns the most recent, valid telegram that was given by the P1 meter, therefore this endpoint is only available for the HWE-P1. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#p1-telegram-api-v1-telegram). |

## Water Meter

Get the water consumption in your home from the [Wi-Fi Watermeter](https://www.homewizard.com/shop/wi-fi-watermeter/):

```typescript
import { WaterMeterApi } from 'homewizard-energy-api';

const api = new WaterMeterApi('http://192.168.1.12');

// Get the active water usage
const data = await api.getData();
```

| Method | API          | Function     | Description                                                                                                                                                                        |
| ------ | ------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api         | `getBasic()` | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                        |
| GET    | /api/v1/data | `getData()`  | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data). |

## kWh Meter 1-phase

Get the power consumption from the [Wi-Fi kWh meter 1-phase MID](https://www.homewizard.com/shop/wi-fi-kwh-meter-1-phase/):

```typescript
import { KwhMeter1PhaseApi } from 'homewizard-energy-api';

const api = new KwhMeter1PhaseApi('http://192.168.1.13');

// Get the power usage from your Wi-Fi kWh meter 1-phase MID
const data = await api.getData();
```

| Method | API          | Function     | Description                                                                                                                                                                        |
| ------ | ------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api         | `getBasic()` | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                        |
| GET    | /api/v1/data | `getData()`  | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data). |

## kWh Meter 3-phase

Get the power consumption from the [Wi-Fi kWh meter 3-phase MID](https://www.homewizard.com/shop/wi-fi-kwh-meter-3-phase/):

```typescript
import { KwhMeter3PhaseApi } from 'homewizard-energy-api';

const api = new KwhMeter3PhaseApi('http://192.168.1.14');

// Get the power usage from your Wi-Fi kWh meter 3-phase MID
const data = await api.getData();
```

| Method | API          | Function     | Description                                                                                                                                                                        |
| ------ | ------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api         | `getBasic()` | Get basic information from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#basic-information-api).                        |
| GET    | /api/v1/data | `getData()`  | Returns the most recent measurement from the device. More info in the [official docs](https://homewizard-energy-api.readthedocs.io/endpoints.html#recent-measurement-api-v1-data). |

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

## About HomeWizard Energy

With the HomeWizard Energy platform, you can get insights in your energy usage. Use the HomeWizard Wi-Fi P1 meter to access real-time data directly from your smart meter, the HomeWizard Wi-Fi Energy Socket to get energy insights from all your devices, the HomeWizard Wi-Fi kWh meter to measure devices such as solar panels and the HomeWizard Wi-Fi Watermeter to get insight in your water usage. With the open API you can integrate the data directly into your system of choice.

## API Introduction

The HomeWizard Wi-Fi P1 meter, Wi-Fi Energy Socket, Wi-Fi kWh meter and Wi-Fi Watermeter (‘device’) have a local API to retrieve the most recent measurements or control the device. You can access this API as long as you are connected to the same (Wi-Fi) network as the device and the API is enabled in the HomeWizard Energy app. This API is intended to connect your device to your own automation, home automation or graphing system. It is not possible to retrieve data history with the local API, as this is not stored on the device itself.
