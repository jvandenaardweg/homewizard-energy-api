import { P1MeterApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the P1 meter in the HomeWizard app first
const p1Meter = new P1MeterApi('http://192.168.1.35');

// The telegram of the smart meter, parsed: the meter, the power per tariff and phase, power failures and gas
const telegram = await p1Meter.getParsedTelegram();

console.log(`${telegram.meter.brand} ${telegram.meter.model}`); // ISK5 2M550T-1012
console.log(`Tariff 1: ${telegram.power.import.t1.value} ${telegram.power.import.t1.unit}`); // 19068.038 kWh
console.log(`Gas: ${telegram.gas?.value} ${telegram.gas?.unit}`); // 6798.545 m3
