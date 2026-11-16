import { P1Meter } from '..';

// Run src/examples/pair.ts first for the credentials
const p1 = new P1Meter({
  host: process.env.HOMEWIZARD_HOST || '192.168.1.35',
  token: process.env.HOMEWIZARD_TOKEN,
  identifier: process.env.HOMEWIZARD_IDENTIFIER,
});

(async () => {
  try {
    console.log(await p1.getDevice());
    console.log(await p1.getMeasurement());
    console.log(await p1.getSystem());
    console.log(await p1.getTelegram());
    console.log(await p1.users.list());
  } catch (err) {
    console.error(err);
  } finally {
    await p1.close();
  }
})();
