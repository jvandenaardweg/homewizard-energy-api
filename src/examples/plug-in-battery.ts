import { PlugInBattery } from '..';

// Run src/examples/pair.ts first for the credentials. The Plug-In Battery only has the API v2.
const battery = new PlugInBattery({
  host: process.env.HOMEWIZARD_HOST || '192.168.1.41',
  token: process.env.HOMEWIZARD_TOKEN,
  identifier: process.env.HOMEWIZARD_IDENTIFIER,
});

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
