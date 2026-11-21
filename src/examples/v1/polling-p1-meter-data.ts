import { P1MeterApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the P1 meter in the HomeWizard app first
const p1Meter = new P1MeterApi('http://192.168.1.35', { polling: { interval: 1000 } });

// Prints what the home uses each second, for 10 seconds
p1Meter.polling.getData.on('response', data => console.log(`${data.active_power_w} W`));
p1Meter.polling.getData.on('error', error => console.error(error));
p1Meter.polling.getData.start();

setTimeout(() => p1Meter.polling.getData.stop(), 10000);
