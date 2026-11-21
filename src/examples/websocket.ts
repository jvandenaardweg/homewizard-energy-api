import { createFileStore, P1Meter } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);
const socket = p1.openWebSocket();

let count = 0;

socket.on('authorized', () => console.log('Authorized'));
socket.on('error', error => console.error(error));
socket.on('close', () => console.log('Closed'));

// Prints each measurement the device pushes, and closes after 10
socket.on('measurement', async measurement => {
  console.log(`${measurement.power_w} W`);

  if (++count === 10) {
    socket.close();
    await p1.close();
  }
});

socket.subscribe('measurement');
