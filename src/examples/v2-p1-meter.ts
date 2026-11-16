import { v2 } from '../';

// Run src/examples/v2-pair.ts first for the token and identifier
const p1 = new v2.P1Meter(process.env.HOMEWIZARD_HOST || '192.168.1.35', {
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
