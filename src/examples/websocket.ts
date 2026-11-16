import { P1Meter } from '..';

// Run src/examples/pair.ts first for the credentials
const p1 = new P1Meter({
  host: process.env.HOMEWIZARD_HOST || '192.168.1.35',
  token: process.env.HOMEWIZARD_TOKEN,
  identifier: process.env.HOMEWIZARD_IDENTIFIER,
});

const socket = p1.openWebSocket();

socket.on('authorized', () => console.log('Authorized'));
socket.on('measurement', measurement => console.log(`${measurement.power_w} W`));
socket.on('error', error => console.error(error));
socket.on('close', code => console.log(`Closed (${code})`));

socket.subscribe('measurement');

// Stop after a minute
setTimeout(async () => {
  socket.close();
  await p1.close();
}, 60000);
