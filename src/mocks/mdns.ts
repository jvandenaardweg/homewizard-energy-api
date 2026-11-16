import * as multicastDns from 'multicast-dns';
import { DiscoveryResponse } from '../v1';

export const mockMdnsTxtData = [
  Buffer.from('api_enabled=1'),
  Buffer.from('path=/api/v1'),
  Buffer.from('serial=3c39e7aabb01'),
  Buffer.from('product_name=Energy Socket'),
  Buffer.from('product_type=HWE-SKT'),
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
      data: 'energysocket-AABB01._hwenergy._tcp.local',
    },
    {
      name: 'energysocket-AABB01._hwenergy._tcp.local',
      type: 'SRV',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: { priority: 0, weight: 0, port: 80, target: 'energysocket-AABB01.local' },
    },
    {
      name: 'energysocket-AABB01._hwenergy._tcp.local',
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
      name: 'energysocket-AABB01.local',
      type: 'A',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: '192.168.1.34',
    },
  ],
};

export const mockDiscoveryResponse: DiscoveryResponse = {
  fqdn: 'energysocket-AABB01._hwenergy._tcp.local',
  hostname: 'energysocket-AABB01.local',
  ip: '192.168.1.34',
  txt: {
    api_enabled: '1',
    path: '/api/v1',
    product_name: 'Energy Socket',
    product_type: 'HWE-SKT',
    serial: '3c39e7aabb01',
  },
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
      data: 'energysocket-AABB01._hwenergy._tcp.local',
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
      data: 'Chromecast-16093dce0910b27a98h7a1bf423e9cc2 51D2._hap._tcp.local',
    },
    {
      name: 'Chromecast-16093dce0910b27a98h7a1bf423e9cc2 51D2._hap._tcp.local',
      type: 'SRV',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: { priority: 0, weight: 0, port: 40987, target: 'B4_F4_BD_66_A4_51.local' },
    },
    {
      name: 'Chromecast-16093dce0910b27a98h7a1bf423e9cc2 51D2._hap._tcp.local',
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
      data: 'fd90:fc83:a0ba:31d6:697c:7e4e:41a1:664d',
    },
    {
      name: 'B4_F4_BD_66_A4_51.local',
      type: 'AAAA',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: 'fe80::2f8:828a:b8f1:e251',
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
