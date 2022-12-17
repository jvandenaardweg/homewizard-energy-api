import { EnergySocketApi } from '..';

const api = new EnergySocketApi('http://192.168.1.32', {
  polling: {
    interval: 1000,
  },
});

(() => {
  api.polling.getState.start();

  api.polling.getState.on('response', response => {
    // Receive the latest state of this Energy Socket from the /api/v1/state endpoint each second:
    // {
    //   power_on: false,
    //   switch_lock: false,
    //   brightness: 0
    // }

    console.log('response', response);
  });

  api.polling.getState.on('error', error => {
    console.log('error', error);
  });

  setTimeout(() => {
    api.polling.getState.stop();
  }, 10000); // stop after 10 seconds for the purpose of this example
})();
