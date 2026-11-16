import { Discovery } from '..';

// Lists the devices with the API v2 on the network for 10 seconds
const discovery = new Discovery();

discovery.start();

discovery.on('response', response => {
  console.log(
    `${response.ip} ${response.txt.product_type} ${response.txt.id} (API ${response.txt.api_version})`,
  );
});

setTimeout(() => discovery.stop(), 10000);
