import { poll } from 'homewizard-energy-api';
import { EnergySocketApi } from 'homewizard-energy-api/v1';

// Turn on the Local API setting for the Energy Socket in the HomeWizard app first. The API v1 has no WebSocket, so
// this asks the socket for its usage and its switch each second.
const socket = new EnergySocketApi('http://192.168.1.10');

const updates = poll(() => Promise.all([socket.getData(), socket.getState()]), { interval: 1000 });

let count = 0;

// Prints a line each second, and stops after 10. The loop stops polling at `break`.
for await (const [data, state] of updates.stream()) {
  console.log(`${state.power_on ? 'On' : 'Off'}, using ${data.active_power_w} W`);
  if (++count === 10) break;
}
