import { createFileStore, HomeWizardError, P1Meter } from 'homewizard-energy-api';

// Run src/examples/pair.ts first, to pair the P1 meter and store its credentials
const credentialsStore = createFileStore('devices.json');
const credentials = await credentialsStore.get('p1');
if (!credentials) throw new Error('Pair the P1 meter first: npx tsx src/examples/pair.ts');

const p1 = new P1Meter(credentials);

try {
  const measurement = await p1.getMeasurement();
  console.log(`The token works: ${measurement.power_w} W`);
} catch (error) {
  // The user was deleted on the device, or someone paired again with the same name
  if (error instanceof HomeWizardError && error.code === 'user:unauthorized') {
    await credentialsStore.delete('p1');
    console.log('The token stopped working: run src/examples/pair.ts to pair again');
  } else {
    throw error;
  }
} finally {
  await p1.close();
}
