import { createFileStore, P1Meter } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);

try {
  const { status_led_brightness_pct: brightness } = await p1.getSystem();

  if (brightness === undefined) {
    console.log('This device has no status LED to change');
  } else {
    console.log(`The status LED is at ${brightness}%`);

    try {
      await p1.updateSystem({ status_led_brightness_pct: 50 });
      await p1.identify(); // Blinks the status LED, so you can see which device this is
      console.log('Set the status LED to 50%, and blinked it');
    } finally {
      // Back to the brightness it had, also when a call failed
      await p1.updateSystem({ status_led_brightness_pct: brightness });
    }
  }
} finally {
  await p1.close();
}
