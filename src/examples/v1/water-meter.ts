import { WaterMeterApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the Watermeter in the HomeWizard app first. It only has a local API when it's
// powered over USB.
const water = new WaterMeterApi('http://192.168.1.12');

const { total_liter_m3, active_liter_lpm } = await water.getData();

console.log(`${total_liter_m3} m3 in total, now ${active_liter_lpm} l/min`);
