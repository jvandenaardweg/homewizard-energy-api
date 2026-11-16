import { P1MeterApi } from '../';

const p1Meter = new P1MeterApi('http://192.168.1.35');

(async () => {
  try {
    // Get a parsed version of the telegram
    const parsedTelegram = await p1Meter.getParsedTelegram();
    // Returns a parsed version of the telegram:
    // {
    //   meter: {
    //     brand: 'ISK5',
    //     model: '2M550T-1012',
    //   },
    //   version: '50',
    //   timestamp: '2022-12-18T22:48:20+01:00',
    //   equipmentId: '4530303132333435363738393031323334',
    //   textMessage: {
    //     codes: null,
    //     message: '',
    //   },
    //   power: {
    //     import: {
    //       t1: {
    //         value: 19068.038,
    //         unit: 'kWh',
    //       },
    //       t2: {
    //         value: 19505.815,
    //         unit: 'kWh',
    //       },
    //       active: {
    //         value: 0.768,
    //         unit: 'kW',
    //       },
    //     },
    //     export: {
    //       t1: {
    //         value: 0.002,
    //         unit: 'kWh',
    //       },
    //       t2: {
    //         value: 0.007,
    //         unit: 'kWh',
    //       },
    //       active: {
    //         value: 0,
    //         unit: 'kW',
    //       },
    //     },
    //     tariffIndicator: 1,
    //     threshold: {
    //       value: null,
    //       unit: null,
    //     },
    //     fuseThreshold: {
    //       value: null,
    //       unit: null,
    //     },
    //     switchPosition: null,
    //     numberOfPowerFailures: 7,
    //     numberOfLongPowerFailures: 4,
    //     longPowerFailureLog: {
    //       count: 1,
    //       log: [
    //         {
    //           startOfFailure: '2017-11-30T18:14:43+01:00',
    //           endOfFailure: '2017-11-30T18:30:27+01:00',
    //           duration: 944,
    //           unit: 's',
    //         },
    //       ],
    //     },
    //     voltageSags: {
    //       l1: 8,
    //       l2: 7,
    //       l3: 11,
    //     },
    //     voltageSwell: {
    //       l1: 1,
    //       l2: 9,
    //       l3: 9,
    //     },
    //     instantaneous: {
    //       current: {
    //         l1: {
    //           value: 0,
    //           unit: 'A',
    //         },
    //         l2: {
    //           value: 0,
    //           unit: 'A',
    //         },
    //         l3: {
    //           value: 3,
    //           unit: 'A',
    //         },
    //       },
    //       voltage: {
    //         l1: {
    //           value: 222,
    //           unit: 'V',
    //         },
    //         l2: {
    //           value: 224,
    //           unit: 'V',
    //         },
    //         l3: {
    //           value: 225,
    //           unit: 'V',
    //         },
    //       },
    //       power: {
    //         positive: {
    //           l1: {
    //             value: 0.07,
    //             unit: 'kW',
    //           },
    //           l2: {
    //             value: 0.013,
    //             unit: 'kW',
    //           },
    //           l3: {
    //             value: 0.683,
    //             unit: 'kW',
    //           },
    //         },
    //         negative: {
    //           l1: {
    //             value: 0,
    //             unit: 'kW',
    //           },
    //           l2: {
    //             value: 0,
    //             unit: 'kW',
    //           },
    //           l3: {
    //             value: 0,
    //             unit: 'kW',
    //           },
    //         },
    //       },
    //     },
    //   },
    //   gas: {
    //     deviceType: '003',
    //     equipmentId: '4730303132333435363738393031323334',
    //     timestamp: '2022-12-18T22:45:01+01:00',
    //     value: 6798.545,
    //     unit: 'm3',
    //     valvePosition: null,
    //   },
    // };

    console.log(JSON.stringify(parsedTelegram));
  } catch (err) {
    console.error(err);
  }
})();
