import { EnergySocketApi } from '..';

const energySocket = new EnergySocketApi('http://192.168.1.32', {
  polling: {
    interval: 1000,
  },
});

(() => {
  energySocket.polling.getData.start();

  energySocket.polling.getData.on('response', response => {
    // Receive the latest data of this Energy Socket from the /api/v1/data endpoint each second:
    // {
    //   wifi_ssid: 'SOME_WIFI_SSID',
    //   wifi_strength: 52,
    //   total_power_import_t1_kwh: 395.612,
    //   total_power_export_t1_kwh: 0,
    //   active_power_w: 0,
    //   active_power_l1_w: 0
    // }

    console.log('response', response);
  });

  energySocket.polling.getData.on('error', error => {
    console.log('error', error);
  });

  setTimeout(() => {
    energySocket.polling.getData.stop();
  }, 10000); // stop after 10 seconds for the purpose of this example
})();
