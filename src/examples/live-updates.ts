import { createFileStore, P1Meter } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);
const socket = p1.openWebSocket();

try {
  let count = 0;

  // Prints each measurement the device pushes, and stops after 10
  for await (const measurement of socket.stream('measurement')) {
    console.log(`${measurement.power_w} W`);
    if (++count === 10) break;
  }
} finally {
  socket.close();
  await p1.close();
}
