import { discover } from '..';

// Lists the devices with the API v2 on the network for 10 seconds
(async () => {
  for await (const found of discover({ timeout: 10000 })) {
    console.log(
      `${found.ip} ${found.txt.product_type} ${found.txt.id} (API ${found.txt.api_version})`,
    );
  }
})();
