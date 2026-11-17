import { pair } from '..';

// Pairs with a device and prints the credentials to store, for the other examples:
// HOMEWIZARD_HOST=<host> HOMEWIZARD_TOKEN=<token> HOMEWIZARD_IDENTIFIER=<identifier> npx tsx src/examples/p1-meter.ts
const host = process.env.HOMEWIZARD_HOST || '192.168.1.35';

(async () => {
  try {
    const name = 'homewizard-energy-api-example';
    const {
      host: pairedHost,
      token,
      identifier,
    } = await pair(host, name, {
      onAttempt: remainingMs =>
        console.log(`Press the button on the device (${Math.round(remainingMs / 1000)}s left)`),
    });

    console.log(`Paired as local/${name}. Keep the token secret:`);
    console.log(
      `HOMEWIZARD_HOST=${pairedHost} HOMEWIZARD_TOKEN=${token} HOMEWIZARD_IDENTIFIER=${identifier}`,
    );
  } catch (err) {
    console.error(err);
  }
})();
