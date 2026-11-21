import { createFileStore, P1Meter } from 'homewizard-energy-api';
import { parseTelegram } from 'homewizard-energy-api/telegram';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);

try {
  // The raw data from the smart meter. The measurement already has the parsed values.
  const telegram = parseTelegram(await p1.getTelegram());

  console.log(`${telegram.meter.brand} ${telegram.meter.model}`);
  console.log(`Tariff 1: ${telegram.power.import.t1.value} ${telegram.power.import.t1.unit}`);
} finally {
  await p1.close();
}
