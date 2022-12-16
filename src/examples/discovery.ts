import { HomeWizardEnergyApi } from '@/api';

const api = new HomeWizardEnergyApi();

api.discovery.start();

api.discovery.on('response', response => {
  console.log('response', response);

  // {
  //   ip: '192.168.1.34',
  //   hostname: 'energysocket-25FF1A.local',
  //   txt: {
  //     api_enabled: '1',
  //     path: '/api/v1',
  //     serial: '3c39e725ff1a',
  //     product_name: 'Energy Socket',
  //     product_type: 'HWE-SKT'
  //   }
  // }
});

api.discovery.on('error', error => {
  console.log('error', error);
});

api.discovery.on('warning', error => {
  console.log('warning', error);
});
