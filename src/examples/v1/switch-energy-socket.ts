import { EnergySocketApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the Energy Socket in the HomeWizard app first. This switches the socket for 5
// seconds, so unplug anything that shouldn't turn off.
const socket = new EnergySocketApi('http://192.168.1.10');

const state = await socket.getState();
console.log(`The socket is ${state.power_on ? 'on' : 'off'}`);

if (state.switch_lock) {
  console.log("The switch lock is on, so the socket can't be turned off");
} else {
  await socket.updateState({ power_on: !state.power_on });
  console.log(`Switched it ${state.power_on ? 'off' : 'on'} for 5 seconds`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await socket.updateState({ power_on: state.power_on });
  console.log(`Switched it back ${state.power_on ? 'on' : 'off'}`);
}
