import * as multicastDns from 'multicast-dns';

export const mockMdnsTxtData = [
  Buffer.from([97, 112, 105, 95, 101, 110, 97, 98, 108, 101, 100, 61, 49]),
  Buffer.from([112, 97, 116, 104, 61, 47, 97, 112, 105, 47, 118, 49]),
  Buffer.from([
    115, 101, 114, 105, 97, 108, 61, 51, 99, 51, 57, 101, 55, 50, 55, 102, 102, 49, 101,
  ]),
  Buffer.from([
    112, 114, 111, 100, 117, 99, 116, 95, 110, 97, 109, 101, 61, 69, 110, 101, 114, 103, 121, 32,
    83, 111, 99, 107, 101, 116,
  ]),
  Buffer.from([
    112, 114, 111, 100, 117, 99, 116, 95, 116, 121, 112, 101, 61, 72, 87, 69, 45, 83, 75, 84,
  ]),
];

// up response
export const mockMdnsResponse: multicastDns.ResponsePacket = {
  id: 0,
  type: 'response',
  flags: 1024,
  // flag_qr: true,
  // opcode: 'QUERY',
  // flag_aa: true,
  // flag_tc: false,
  // flag_rd: false,
  // flag_ra: false,
  // flag_z: false,
  // flag_ad: false,
  // flag_cd: false,
  // rcode: 'NOERROR',
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
      data: { priority: 0, weight: 0, port: 80, target: 'energysocket-27FF1E.local' },
    },
    {
      name: 'energysocket-27FF1E._hwenergy._tcp.local',
      type: 'TXT',
      ttl: 4500,
      class: 'IN',
      flush: true,
      data: mockMdnsTxtData,
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

export const mockMdnsGoodbyeResponse: multicastDns.ResponsePacket = {
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
      ttl: 0, // goodbye
      class: 'IN',
      flush: false,
      data: 'energysocket-27FF1E._hwenergy._tcp.local',
    },
  ],
  authorities: [],
  additionals: [],
};

// example response that is not a hwenergy device
export const mockMdnsResponseChromecast: multicastDns.ResponsePacket = {
  id: 0,
  type: 'response',
  flags: 1024,
  // flag_qr: true,
  // opcode: 'QUERY',
  // flag_aa: true,
  // flag_tc: false,
  // flag_rd: false,
  // flag_ra: false,
  // flag_z: false,
  // flag_ad: false,
  // flag_cd: false,
  // rcode: 'NOERROR',
  questions: [],
  answers: [
    {
      name: '_hap._tcp.local',
      type: 'PTR',
      ttl: 4500,
      class: 'IN',
      flush: false,
      data: 'Chromecast-16091dcc0910b17a98b7a1bf523e7cc2 51D2._hap._tcp.local',
    },
    {
      name: 'Chromecast-16091dcc0910b17a98b7a1bf523e7cc2 51D2._hap._tcp.local',
      type: 'SRV',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: { priority: 0, weight: 0, port: 40987, target: 'B4_F4_BD_66_A4_51.local' },
    },
    {
      name: 'Chromecast-16091dcc0910b17a98b7a1bf523e7cc2 51D2._hap._tcp.local',
      type: 'TXT',
      ttl: 4500,
      class: 'IN',
      flush: true,
      data: [],
    },
    {
      name: 'B4_F4_BD_66_A4_51.local',
      type: 'A',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: '192.168.1.21',
    },
    {
      name: 'B4_F4_BD_66_A4_51.local',
      type: 'AAAA',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: 'fd90:fc83:a0ba:41d6:797c:8e4e:51a1:664d',
    },
    {
      name: 'B4_F4_BD_66_A4_51.local',
      type: 'AAAA',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: 'fe80::9f8:928a:b8f1:e251',
    },
    {
      name: '_services._dns-sd._udp.local',
      type: 'PTR',
      ttl: 4500,
      class: 'IN',
      flush: false,
      data: '_hap._tcp.local',
    },
  ],
  authorities: [],
  additionals: [],
};
