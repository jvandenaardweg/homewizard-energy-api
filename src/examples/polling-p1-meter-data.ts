import { P1MeterApi } from '..';

const p1Meter = new P1MeterApi('http://192.168.1.35', {
  polling: {
    interval: 1000,
  },
});

(() => {
  p1Meter.polling.getData.start();

  p1Meter.polling.getData.on('response', response => {
    // Receive the latest data of this P1 Meter from the /api/v1/data endpoint each second:
    // {
    //   smr_version: 50,
    //   meter_model: 'ISKRA 2M550T-1012',
    //   wifi_ssid: 'SOME_WIFI_SSID',
    //   wifi_strength: 100,
    //   total_power_import_t1_kwh: 19055.287,
    //   total_power_import_t2_kwh: 19505.815,
    //   total_power_export_t1_kwh: 0.002,
    //   total_power_export_t2_kwh: 0.007,
    //   active_power_w: 997,
    //   active_power_l1_w: 66,
    //   active_power_l2_w: 88,
    //   active_power_l3_w: 852,
    //   total_gas_m3: 6789.488,
    //   gas_timestamp: 221217223003
    // }

    console.log('response', response);
  });

  p1Meter.polling.getData.on('error', error => {
    console.log('error', error);
  });

  setTimeout(() => {
    p1Meter.polling.getData.stop();
  }, 10000); // stop after 10 seconds for the purpose of this example
})();
