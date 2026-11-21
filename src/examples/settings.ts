import { createFileStore, P1Meter } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);

try {
  const system = await p1.getSystem();
  console.log(`The status LED is at ${system.status_led_brightness_pct}%`);

  await p1.updateSystem({ status_led_brightness_pct: 50 });
  await p1.identify(); // Blinks the status LED, so you can see which device this is
  console.log('Set the status LED to 50%, and blinked it');

  // Back to the brightness it had
  await p1.updateSystem({ status_led_brightness_pct: system.status_led_brightness_pct });
} finally {
  await p1.close();
}
