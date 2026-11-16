import { P1MeterApiV2, getCertificateIdentifier } from '../';

// The API v2 uses HTTPS. The identifier is used to validate the certificate of the device,
// it is the "id" txt record of the discovery response, or can be created with the product type and serial.
const p1Meter = new P1MeterApiV2('https://192.168.1.35', {
  api: {
    identifier: getCertificateIdentifier('HWE-P1', '5c2fafaabbcc'),
    // token: 'THE_TOKEN_YOU_STORED',
  },
});

(async () => {
  try {
    // Without a token: ask the user to press the button on the device, then wait for it (max 2 minutes here)
    console.log('Press the button on the P1 Meter...');

    const { token } = await p1Meter.pair('my-app', {
      timeout: 120000,
      onTry: remaining =>
        console.log(`Waiting for the button, ${Math.round(remaining / 1000)}s left`),
    });

    // Store this token, it can not be requested again
    console.log('token', token);

    // Get the most recent measurement
    console.log(await p1Meter.getData());

    // Get the state of the Plug-In Batteries that are connected to this P1 Meter
    console.log(await p1Meter.getBatteries());
  } catch (err) {
    console.error(err);
  } finally {
    await p1Meter.close();
  }
})();
