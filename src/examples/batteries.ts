import { createFileStore, P1Meter } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials. A kWh meter controls the
// batteries the same way. Permissions need API 2.2.0 or later.
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);

try {
  const batteries = await p1.getBatteries();
  console.log(
    `${batteries.battery_count} batteries in mode ${batteries.mode}, at ${batteries.power_w} W`,
  );

  const { mode, permissions } = batteries;

  // Changing the permissions in another mode, such as predictive, would switch the batteries to mode zero
  if (mode !== 'zero' || !permissions) {
    console.log(
      'Leaves the permissions alone: this example only changes them in mode zero, from API 2.2.0',
    );
  } else {
    try {
      // Charge, but don't discharge
      const updated = await p1.updateBatteries({ permissions: ['charge_allowed'] });
      console.log(`Permissions: ${updated.permissions?.join(', ')}`);
    } finally {
      // Back to what the batteries were allowed before, also when the change failed
      await p1.updateBatteries({ permissions });
    }
  }
} finally {
  await p1.close();
}
