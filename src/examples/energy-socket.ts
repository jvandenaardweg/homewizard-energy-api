import { EnergySocketApi } from '../';

const energySocket = new EnergySocketApi('http://192.168.1.10');

(async () => {
  try {
    // Turn the Energy Socket ON
    const updatedState = await energySocket.updateState({ power_on: true });

    console.log(updatedState);
  } catch (err) {
    console.error(err);
  }
})();
