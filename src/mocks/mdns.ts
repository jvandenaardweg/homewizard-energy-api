import * as multicastDns from 'multicast-dns';

// up response
export const mdnsResponse: multicastDns.ResponsePacket = {
  id: 0,
  type: 'response',
  flags: 1024,
  //   flag_qr: true,
  //   opcode: 'QUERY',
  //   flag_aa: true,
  //   flag_tc: false,
  //   flag_rd: false,
  //   flag_ra: false,
  //   flag_z: false,
  //   flag_ad: false,
  //   flag_cd: false,
  //   rcode: 'NOERROR',
  questions: [],
  answers: [
    {
      name: '_hwenergy._tcp.local',
      type: 'PTR',
      ttl: 4500,
      class: 'IN',
      flush: false,
      data: 'energysocket-27FF1E._hwenergy._tcp.local',
    },
    {
      name: 'energysocket-27FF1E._hwenergy._tcp.local',
      type: 'SRV',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: {
        port: 80,
        target: 'energysocket-27FF1E.local',
        priority: 0,
        weight: 0,
      },
    },
    {
      name: 'energysocket-27FF1E._hwenergy._tcp.local',
      type: 'TXT',
      ttl: 4500,
      class: 'IN',
      flush: true,
      data: [], // TODO: use Buffer[];
    },
  ],
  authorities: [],
  additionals: [
    {
      name: 'energysocket-27FF1E.local',
      type: 'A',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: '192.168.1.34',
    },
  ],
};
