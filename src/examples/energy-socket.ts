import { EnergySocketApi } from '../';

const api = new EnergySocketApi('http://192.168.1.10');

(async () => {
  try {
    // Turn the Energy Socket ON
    const updatedState = await api.updateState({ power_on: true });

    console.log(updatedState);
  } catch (err) {
    console.error(err);
  }
})();
