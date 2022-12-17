import { P1MeterApi } from '..';

const api = new P1MeterApi('http://192.168.1.35', {
  polling: {
    interval: 1000,
  },
});

(async () => {
  api.polling.getData.start();

  api.polling.getData.on('response', response => {
    console.log('response', response);
  });

  api.polling.getData.on('error', error => {
    console.log('error', error);
  });

  setTimeout(() => {
    api.polling.getData.stop();
  }, 10000); // stop after 10 seconds for the purpose of this example
})();
