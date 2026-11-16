import { pair } from '..';

// Pairs with a device and prints the token and identifier to store, for the other v2 examples:
// HOMEWIZARD_TOKEN=<token> HOMEWIZARD_IDENTIFIER=<identifier> npx tsx src/examples/p1-meter.ts
const host = process.env.HOMEWIZARD_HOST || '192.168.1.35';

(async () => {
  try {
    const { token, identifier, name } = await pair(host, 'homewizard-energy-api-example', {
      onAttempt: remainingMs =>
        console.log(`Press the button on the device (${Math.round(remainingMs / 1000)}s left)`),
    });

    console.log(`Paired as ${name}. Keep the token secret:`);
    console.log(`HOMEWIZARD_TOKEN=${token} HOMEWIZARD_IDENTIFIER=${identifier}`);
  } catch (err) {
    console.error(err);
  }
})();
