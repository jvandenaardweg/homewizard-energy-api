import { HomeWizardEnergyDiscovery } from '@/homewizard-energy-discovery';

const homeWizardEnergyDiscovery = new HomeWizardEnergyDiscovery();

homeWizardEnergyDiscovery.start();

homeWizardEnergyDiscovery.on('response', response => {
  console.log('response', response);
  // {
  //   ip: '192.168.1.34',
  //   hostname: 'energysocket-25FF1A.local',
  //   fqdn: 'energysocket-25FF1A._hwenergy._tcp.local',
  //   txt: {
  //     api_enabled: '1',
  //     path: '/api/v1',
  //     serial: '3c39e725ff1a',
  //     product_name: 'Energy Socket',
  //     product_type: 'HWE-SKT'
  //   }
  // }
});

homeWizardEnergyDiscovery.on('error', error => {
  console.log('error', error);
});

homeWizardEnergyDiscovery.on('warning', error => {
  console.log('warning', error);
});
