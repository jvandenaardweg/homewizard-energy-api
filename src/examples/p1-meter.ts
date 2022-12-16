import { P1MeterApi } from '../';

const api = new P1MeterApi('http://192.168.1.11');

(async () => {
  try {
    // Get the active power and gas usage
    const data = await api.getData();

    console.log(data);
  } catch (err) {
    console.error(err);
  }
})();
