import { createFileStore, pair } from 'homewizard-energy-api';

// Pairs with a device and stores its credentials in devices.json, where the other examples read them.
// Set the host to your device's IP address. To pair another device, change the key too, such as to 'battery'.
const host = '192.168.1.35';
const key = 'p1';

const credentialsStore = createFileStore('devices.json');

const credentials = await pair(host, 'homewizard-energy-api-example', {
  // On the kWh meters, hold the button for 1 to 3 seconds
  onAttempt: remainingMs =>
    console.log(`Press the button on the device (${Math.round(remainingMs / 1000)}s left)`),
});

await credentialsStore.set(key, credentials);

console.log(`Paired with ${credentials.identifier}, stored as "${key}" in devices.json`);
