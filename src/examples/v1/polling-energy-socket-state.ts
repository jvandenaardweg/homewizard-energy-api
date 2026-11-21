import { EnergySocketApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the Energy Socket in the HomeWizard app first
const socket = new EnergySocketApi('http://192.168.1.10', { polling: { interval: 1000 } });

// Prints whether the socket is on each second, for 10 seconds
socket.polling.getState.on('response', state => console.log(state.power_on ? 'On' : 'Off'));
socket.polling.getState.on('error', error => console.error(error));
socket.polling.getState.start();

setTimeout(() => socket.polling.getState.stop(), 10000);
