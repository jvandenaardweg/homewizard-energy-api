import { HomeWizardEnergyDiscovery } from 'homewizard-energy-api/v1';

// Lists the devices with the API v1 turned on, for 10 seconds
const discovery = new HomeWizardEnergyDiscovery();

// Start first: the listeners attach to the running mDNS
discovery.start();

discovery.on('response', response => {
  console.log(`${response.ip} ${response.txt.product_type} ${response.txt.product_name}`);
  // 192.168.1.10 HWE-SKT Energy Socket
});
discovery.on('error', error => console.error(error));
discovery.on('warning', warning => console.warn(warning));

setTimeout(() => discovery.stop(), 10000);
