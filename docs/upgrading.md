# Upgrading

## From 2.x to 3.0

The API v1 classes didn't change, but moved to their own entry point. Change the import, and the rest of your code keeps working:

```typescript
// 2.x
import { P1MeterApi, HomeWizardEnergyDiscovery } from 'homewizard-energy-api';

// 3.0
import { P1MeterApi, HomeWizardEnergyDiscovery } from 'homewizard-energy-api/v1';
```

The package is ESM now, and imports of files inside `dist/` no longer work. Use the three entry points: the root, `homewizard-energy-api/v1` and `homewizard-energy-api/telegram`.

The root has its own `DiscoveryResponse` and `MdnsTxtRecord` types now, for `_homewizard._tcp`, and no longer exports `MDNS_DISCOVERY_TYPE` and `MDNS_DISCOVERY_DOMAIN`. Import the v1 ones from `homewizard-energy-api/v1`.

## From the API v1 to the API v2

1. Pair with the device (see [Pairing](https://github.com/jvandenaardweg/homewizard-energy-api#pairing)), instead of enabling the Local API in the HomeWizard app.
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
