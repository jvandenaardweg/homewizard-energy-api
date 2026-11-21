import { P1MeterApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the P1 meter in the HomeWizard app first. The P1 meter also has the API v2:
// see src/examples/p1-meter.ts
const p1Meter = new P1MeterApi('http://192.168.1.35');

const data = await p1Meter.getData();

console.log(`Using ${data.active_power_w} W, ${data.total_gas_m3} m3 of gas in total`);
