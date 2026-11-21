import { createFileStore, P1Meter } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);

try {
  const measurement = await p1.getMeasurement();

  console.log(`Using ${measurement.power_w} W`); // Negative when the home delivers power to the grid
  console.log(
    `Imported ${measurement.energy_import_kwh} kWh, exported ${measurement.energy_export_kwh} kWh`,
  );

  for (const meter of measurement.external ?? []) {
    console.log(`${meter.type}: ${meter.value} ${meter.unit}`); // gas_meter: 2569.646 m3
  }
} finally {
  await p1.close();
}
