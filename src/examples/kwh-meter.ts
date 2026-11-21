import { createFileStore, KwhMeter3Phase } from 'homewizard-energy-api';

// Run src/examples/pair.ts first with the key 'kwhMeter', to pair the kWh meter and store its credentials. To pair
// a kWh meter, hold its button for 1 to 3 seconds. For a 1-phase meter (HWE-KWH1, SDM230-wifi), use KwhMeter1Phase.
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('kwhMeter');
if (!credentials) throw new Error('Pair the kWh meter first: npx tsx src/examples/pair.ts');

const kwhMeter = new KwhMeter3Phase(credentials);

try {
  const measurement = await kwhMeter.getMeasurement();

  console.log(`${measurement.power_w} W (L1 ${measurement.power_l1_w} W)`);
  console.log(await kwhMeter.getSystem());

  // The Plug-In Batteries this kWh meter controls
  console.log(await kwhMeter.getBatteries());
} finally {
  await kwhMeter.close();
}
