import { EnergySocketApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the Energy Socket in the HomeWizard app first
const socket = new EnergySocketApi('http://192.168.1.10');

const data = await socket.getData();

console.log(`Using ${data.active_power_w} W at ${data.active_voltage_v} V`);
console.log(
  `Imported ${data.total_power_import_kwh} kWh, exported ${data.total_power_export_kwh} kWh`,
);
