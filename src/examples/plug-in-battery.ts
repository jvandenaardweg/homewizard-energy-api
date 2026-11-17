import { PlugInBattery } from '..';
import { credentialsFromEnv } from './credentials';

// Run src/examples/pair.ts first for the credentials. The Plug-In Battery only has the API v2.
const battery = new PlugInBattery(credentialsFromEnv('192.168.1.41'));

(async () => {
  try {
    const measurement = await battery.getMeasurement();

    console.log(`${measurement.state_of_charge_pct}% charged, ${measurement.power_w} W`);
    console.log(await battery.getSystem());

    // The P1 Meter or kWh meter controls the battery mode: use its getBatteries() and updateBatteries()
  } catch (err) {
    console.error(err);
  } finally {
    await battery.close();
  }
})();
