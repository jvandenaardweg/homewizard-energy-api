import { connect, createFileStore, discover, isSameIdentifier } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

// Looks for the paired device for 10 seconds, and stores its address, so the next start connects straight away
let found = false;

for await (const announced of discover({ timeout: 10000 })) {
  // Anyone on the network can announce a device: connect() only accepts the one you paired with
  if (!isSameIdentifier(announced.txt.id, credentials.identifier)) continue;

  const device = connect(announced, credentials);
  await credentialsStore.set('p1', { ...credentials, host: device.host });
  await device.close();

  console.log(`Found ${credentials.identifier} at ${device.host}`);
  found = true;
  break;
}

if (!found) console.log(`${credentials.identifier} isn't on the network`);
