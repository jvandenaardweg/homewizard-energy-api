import { WaterMeterApi } from '../';

const api = new WaterMeterApi('http://192.168.1.20');

(async () => {
  try {
    // Get the data from the water meter
    const data = await api.getData();

    console.log(data);
  } catch (err) {
    console.error(err);
  }
})();
