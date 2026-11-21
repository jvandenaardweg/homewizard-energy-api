import { EnergySocketApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the Energy Socket in the HomeWizard app first
const socket = new EnergySocketApi('http://192.168.1.10', { polling: { interval: 1000 } });

// Prints what the socket uses each second, for 10 seconds
socket.polling.getData.on('response', data => console.log(`${data.active_power_w} W`));
socket.polling.getData.on('error', error => console.error(error));
socket.polling.getData.start();

setTimeout(() => socket.polling.getData.stop(), 10000);
