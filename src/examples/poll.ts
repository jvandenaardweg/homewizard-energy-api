import { createFileStore, P1Meter, poll } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);

try {
  let count = 0;

  // Asks for a measurement each second, and stops after 10. The loop stops polling at `break`.
  for await (const measurement of poll(() => p1.getMeasurement(), { interval: 1000 }).stream()) {
    console.log(`${measurement.power_w} W`);
    if (++count === 10) break;
  }
} finally {
  await p1.close();
}
