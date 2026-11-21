import { createFileStore, PlugInBattery } from 'homewizard-energy-api';

// Run src/examples/pair.ts first with the key 'battery', to pair the Plug-In Battery and store its credentials.
// The Plug-In Battery only has the API v2.
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('battery');
if (!credentials) throw new Error('Pair the battery first: npx tsx src/examples/pair.ts');

const battery = new PlugInBattery(credentials);

try {
  const measurement = await battery.getMeasurement();

  console.log(`${measurement.state_of_charge_pct}% charged, ${measurement.power_w} W`);
  console.log(await battery.getSystem());

  // The P1 meter or kWh meter controls the battery mode: see src/examples/batteries.ts
} finally {
  await battery.close();
}
