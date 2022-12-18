import { P1MeterApi } from '../';

const p1Meter = new P1MeterApi('http://192.168.1.11');

(async () => {
  try {
    // Get the active power and gas usage
    const data = await p1Meter.getData();

    console.log(data);
  } catch (err) {
    console.error(err);
  }
})();
