import { KwhMeter3PhaseApi } from '../';

const kwhMeter3Phase = new KwhMeter3PhaseApi('http://192.168.1.46');

(async () => {
  try {
    // Get the power usage
    const data = await kwhMeter3Phase.getData();

    console.log(data);
  } catch (err) {
    console.error(err);
  }
})();
