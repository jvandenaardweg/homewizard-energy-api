import { P1MeterApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the P1 meter in the HomeWizard app first
const p1Meter = new P1MeterApi('http://192.168.1.35', { polling: { interval: 1000 } });

// Prints the first line of the raw telegram each second, for 10 seconds: /ISK5\2M550T-1012
p1Meter.polling.getTelegram.on('response', telegram => console.log(telegram.split('\n')[0]));
p1Meter.polling.getTelegram.on('error', error => console.error(error));
p1Meter.polling.getTelegram.start();

setTimeout(() => p1Meter.polling.getTelegram.stop(), 10000);
