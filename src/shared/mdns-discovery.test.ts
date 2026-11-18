import * as multicastDns from 'multicast-dns';
import { mockMdnsV2Response } from '@/mocks/mdns-v2';
import { MdnsDiscovery } from './mdns-discovery';

type Answer = multicastDns.ResponsePacket['answers'][number];

const FQDN = 'p1meter-AABB02._homewizard._tcp.local';

const txtAnswer = mockMdnsV2Response.answers.find(answer => answer.type === 'TXT')!;

/** `mockMdnsV2Response` with its TXT record renamed. */
const withTxtName = (name: string | undefined): multicastDns.ResponsePacket => ({
  ...mockMdnsV2Response,
  answers: mockMdnsV2Response.answers.map(answer =>
    answer.type === 'TXT' ? { ...answer, name } : answer,
  ) as Answer[],
});

describe('MdnsDiscovery TXT record lookup', () => {
  let discovery: MdnsDiscovery<{ product_type?: string }>;

  beforeEach(() => {
    discovery = new MdnsDiscovery('homewizard');
  });

  it('should find the TXT record in the additional section', () => {
    const response = {
      ...mockMdnsV2Response,
      answers: mockMdnsV2Response.answers.filter(answer => answer.type !== 'TXT'),
      additionals: [...mockMdnsV2Response.additionals, txtAnswer],
    };

    expect(discovery['getTxtRecordFromResponse'](response)).toMatchObject({
      product_type: 'HWE-P1',
    });
  });

  it('should prefer the TXT record of the fqdn, without case', () => {
    const other = {
      ...txtAnswer,
      name: 'p1meter-OTHER._homewizard._tcp.local',
      data: [Buffer.from('product_type=HWE-KWH1')],
    } as Answer;
    const response = { ...mockMdnsV2Response, answers: [other, ...mockMdnsV2Response.answers] };

    expect(
      discovery['getTxtRecordFromResponse'](response, 'P1Meter-AABB02._homewizard._tcp.local'),
    ).toMatchObject({ product_type: 'HWE-P1' });
  });

  it('should match the fqdn and the service with a trailing dot', () => {
    expect(discovery['findTxtRecord'](withTxtName(`${FQDN}.`), FQDN)).toBeDefined();
    expect(discovery['getTxtRecordFromResponse'](withTxtName(`${FQDN}.`))).toMatchObject({
      product_type: 'HWE-P1',
    });
  });

  it('should only take the service type as the suffix of the name', () => {
    expect(
      discovery['getTxtRecordFromResponse'](withTxtName('x._homewizard._udp.local')),
    ).toBeNull();
    expect(
      discovery['findTxtRecord'](withTxtName('x._homewizard._tcp.example.com')),
    ).toBeUndefined();
    expect(
      discovery['findTxtRecord'](withTxtName('x._homewizard._tcp.example.com'), FQDN),
    ).toBeUndefined();
  });

  it('should not take a service type that ends with this one as this service', () => {
    expect(
      discovery['getTxtRecordFromResponse'](withTxtName('x._xhomewizard._tcp.local')),
    ).toBeNull();
  });

  it('should not use the TXT record of another service', () => {
    expect(
      discovery['getTxtRecordFromResponse'](withTxtName('p1meter-AABB02._hwenergy._tcp.local')),
    ).toBeNull();
    expect(discovery['findTxtRecord'](withTxtName('x._hwenergy._tcp.example.com'))).toBeUndefined();
  });

  it('should read a response without answer or additional section', () => {
    const { additionals: _additionals, ...withoutAdditionals } = mockMdnsV2Response;
    const { answers: _answers, ...withoutAnswers } = mockMdnsV2Response;

    expect(
      discovery['getTxtRecordFromResponse'](withoutAdditionals as multicastDns.ResponsePacket),
    ).toMatchObject({ product_type: 'HWE-P1' });
    expect(
      discovery['getTxtRecordFromResponse'](withoutAnswers as multicastDns.ResponsePacket),
    ).toBeNull();
  });

  it('should still use a TXT record that names no service', () => {
    expect(discovery['getTxtRecordFromResponse'](withTxtName(undefined))).toMatchObject({
      product_type: 'HWE-P1',
    });
    expect(discovery['findTxtRecord'](withTxtName('p1meter-AABB02.local'))).toBeDefined();
  });
});
