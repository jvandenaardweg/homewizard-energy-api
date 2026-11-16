import { KwhMeter3Phase } from '..';

// Run src/examples/pair.ts first for the credentials. To pair a kWh meter, hold its button for 1 to 3
// seconds. For a 1-phase meter (HWE-KWH1, SDM230-wifi), use KwhMeter1Phase instead.
const kwhMeter = new KwhMeter3Phase({
  host: process.env.HOMEWIZARD_HOST || '192.168.1.40',
  token: process.env.HOMEWIZARD_TOKEN,
  identifier: process.env.HOMEWIZARD_IDENTIFIER,
});

(async () => {
  try {
    const measurement = await kwhMeter.getMeasurement();

    console.log(`${measurement.power_w} W (L1 ${measurement.power_l1_w} W)`);
    console.log(await kwhMeter.getSystem());

    // The Plug-In Batteries this kWh meter controls
    console.log(await kwhMeter.getBatteries());
  } catch (err) {
    console.error(err);
  } finally {
    await kwhMeter.close();
  }
})();
