# HomeWizard Energy API

Full type-safe implementation of the HomeWizard Energy API in Node.

Official documentation: https://homewizard-energy-api.readthedocs.io/index.html

# Installation

```
project needs to be published on npm first, just started
```

Control your [Wi-Fi Energy Socket](https://www.homewizard.com/shop/wi-fi-energy-socket/):

```typescript
import { EnergySocketApi } from 'homewizard-energy-api';

const api = new EnergySocketApi('http://192.168.1.10');

// Turn the Energy Socket ON
const updatedState = await api.updateState({ power_on: true });
```

Get the power consumption or gas usage in your home from the [Wi-Fi P1 Meter](https://www.homewizard.com/shop/wi-fi-p1-meter/):

```typescript
import { P1MeterApi } from 'homewizard-energy-api';

const api = new P1MeterApi('http://192.168.1.11');

// Get the active power and gas usage
const data = await api.getData();
```

Get the water consumption in your home from the [Wi-Fi Watermeter](https://www.homewizard.com/shop/wi-fi-watermeter/):

```typescript
import { WaterMeterApi } from 'homewizard-energy-api';

const api = new WaterMeterApi('http://192.168.1.12');

// Get the active water usage
const data = await api.getData();
```

Get the power consumption from the [Wi-Fi kWh meter 1-phase MID](https://www.homewizard.com/shop/wi-fi-kwh-meter-1-phase/):

```typescript
import { KwhMeter1PhaseApi } from 'homewizard-energy-api';

const api = new KwhMeter1PhaseApi('http://192.168.1.13');

// Get the power usage from your Wi-Fi kWh meter 1-phase MID
const data = await api.getData();
```

Get the power consumption from the [Wi-Fi kWh meter 3-phase MID](https://www.homewizard.com/shop/wi-fi-kwh-meter-3-phase/):

```typescript
import { KwhMeter3PhaseApi } from 'homewizard-energy-api';

const api = new KwhMeter3PhaseApi('http://192.168.1.14');

// Get the power usage from your Wi-Fi kWh meter 3-phase MID
const data = await api.getData();
```

Discover the HomeWizard devices in your network using Multicast DNS:

```typescript
import { HomeWizardEnergyApi } from 'homewizard-energy-api';

const api = new HomeWizardEnergyApi();

api.discovery.start();

api.discovery.on('response', response => {
  // response:
  // {
  //   ip: '192.168.1.34',
  //   hostname: 'energysocket-25FF1A.local',
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
