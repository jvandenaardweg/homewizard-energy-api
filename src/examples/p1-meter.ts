import { P1Meter } from '..';
import { credentialsFromEnv } from './credentials';

// Run src/examples/pair.ts first for the credentials
const p1 = new P1Meter(credentialsFromEnv('192.168.1.35'));

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
