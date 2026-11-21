import { KwhMeter1PhaseApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the kWh meter in the HomeWizard app first. The kWh meters also have the API
// v2: see src/examples/kwh-meter.ts
const kwhMeter = new KwhMeter1PhaseApi('http://192.168.1.45');

const data = await kwhMeter.getData();

console.log(`Using ${data.active_power_w} W, ${data.total_power_import_t1_kwh} kWh in total`);
