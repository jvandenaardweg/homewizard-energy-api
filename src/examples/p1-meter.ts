import { createFileStore, P1Meter } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);

try {
  console.log(await p1.getDevice());
  console.log(await p1.getMeasurement());
  console.log(await p1.getSystem());
  console.log(await p1.getTelegram());
  console.log(await p1.users.list());
} finally {
  await p1.close();
}
