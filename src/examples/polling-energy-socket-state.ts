import { EnergySocketApi } from '..';

const api = new EnergySocketApi('http://192.168.1.32', {
  polling: {
    interval: 1000,
  },
});

(async () => {
  api.polling.getState.start();

  api.polling.getState.on('response', response => {
    console.log('response', response);
  });

  api.polling.getState.on('error', error => {
    console.log('error', error);
  });

  setTimeout(() => {
    api.polling.getState.stop();
  }, 10000); // stop after 10 seconds for the purpose of this example
})();
