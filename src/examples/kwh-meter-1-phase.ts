import { KwhMeter1PhaseApi } from '../';

const kwhMeter1Phase = new KwhMeter1PhaseApi('http://192.168.1.45');

(async () => {
  try {
    // Get the power usage
    const data = await kwhMeter1Phase.getData();

    console.log(data);
  } catch (err) {
    console.error(err);
  }
})();
