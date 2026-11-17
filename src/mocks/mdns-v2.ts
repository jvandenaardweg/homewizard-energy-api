import * as multicastDns from 'multicast-dns';
import type { DiscoveryResponse } from '../discovery';

/* A `_homewizard._tcp` response, shaped like the one from a P1 Meter with API 2.2.0. */

export const mockMdnsV2TxtData = [
  Buffer.from('serial=3c39e7aabb02'),
  Buffer.from('product_type=HWE-P1'),
  Buffer.from('product_name=P1 Meter'),
  Buffer.from('id=appliance/p1dongle/3c39e7aabb02'),
  Buffer.from('api_version=2.2.0'),
];

export const mockMdnsV2Response: multicastDns.ResponsePacket = {
  id: 0,
  type: 'response',
  flags: 1024,
  questions: [],
  answers: [
    {
      name: '_homewizard._tcp.local',
      type: 'PTR',
      ttl: 4500,
      class: 'IN',
      flush: false,
      data: 'p1meter-AABB02._homewizard._tcp.local',
    },
    {
      name: 'p1meter-AABB02._homewizard._tcp.local',
      type: 'SRV',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: { priority: 0, weight: 0, port: 443, target: 'p1meter-AABB02.local' },
    },
    {
      name: 'p1meter-AABB02._homewizard._tcp.local',
      type: 'TXT',
      ttl: 4500,
      class: 'IN',
      flush: true,
      data: mockMdnsV2TxtData,
    },
  ],
  authorities: [],
  additionals: [
    {
      name: 'p1meter-AABB02.local',
      type: 'A',
      ttl: 120,
      class: 'IN',
      flush: true,
      data: '192.168.1.35',
    },
  ],
};

/** What `Discovery` makes of `mockMdnsV2Response`. */
export const mockDiscoveryV2Response: DiscoveryResponse = {
  ip: '192.168.1.35',
  hostname: 'p1meter-AABB02.local',
  fqdn: 'p1meter-AABB02._homewizard._tcp.local',
  txt: {
    serial: '3c39e7aabb02',
    product_type: 'HWE-P1',
    product_name: 'P1 Meter',
    id: 'appliance/p1dongle/3c39e7aabb02',
    api_version: '2.2.0',
  },
};
