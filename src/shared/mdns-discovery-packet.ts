import type * as multicastDns from 'multicast-dns';
import { bufferArrayToJSON, isBufferArray } from './buffer';

export type MdnsRecord = multicastDns.ResponsePacket['answers'][number];

export interface MdnsDiscoveryResponse<TTxtRecord> {
  ip: string;
  hostname: string;
  fqdn: string;
  txt: TTxtRecord;
}

export interface MdnsHostDetails {
  ip: string;
  hostname: string;
}

/*
 * The pure steps of reading one mDNS packet for one service domain, such as `_homewizard._tcp.local`. The protected
 * finders of `MdnsDiscovery` call them, each for its own piece, so a subclass can still override any finder.
 *
 * A device can announce several services in one packet, so every record is matched by its name: the PTR by the
 * service domain, and the SRV and TXT by the fqdn the PTR points at. Names compare without case and with or
 * without the trailing dot. The host is the A record of the SRV target, or without an SRV, the first A record.
 *
 * None of them throws, because they read packets from anyone on the network.
 *
 * @link https://api-documentation.homewizard.com/docs/discovery
 */

/** Whether two mDNS names are the same: without case, and with or without the trailing dot of the root. */
export function isSameName(a: unknown, b: unknown): boolean {
  const name = normalizeName(a);

  return name !== undefined && name === normalizeName(b);
}

/** The first PTR answer named for the service, the one a device answers a query of the service with. */
export function findServicePtr(
  packet: multicastDns.ResponsePacket,
  serviceDomain: string,
): MdnsRecord | undefined {
  return servicePtrs(packet, serviceDomain)[0];
}

/** The fqdn of the device: the instance name that a PTR of the service points at. */
export function findFqdn(
  packet: multicastDns.ResponsePacket,
  serviceDomain: string,
): string | null {
  const ptr = servicePtrs(packet, serviceDomain).find(record =>
    isInstanceOf(dataOf(record), serviceDomain),
  );

  return ptr ? (dataOf(ptr) as string) : null;
}

/** Whether the packet says goodbye for this device: a PTR of the service to the fqdn, with a ttl of 0. */
export function isGoodbye(
  packet: multicastDns.ResponsePacket,
  serviceDomain: string,
  fqdn: string,
): boolean {
  return servicePtrs(packet, serviceDomain).some(
    record => isSameName(dataOf(record), fqdn) && (record as { ttl?: unknown }).ttl === 0,
  );
}

/**
 * The A record of the device: the one of the SRV target of the fqdn, or without that SRV, the first A record. The
 * additional section wins over the answers.
 */
export function findHost(
  packet: multicastDns.ResponsePacket,
  fqdn: string | null,
): MdnsRecord | undefined {
  const all = [...section(packet?.additionals), ...section(packet?.answers)];
  const aRecords = all.filter(record => record.type === 'A');
  const srv = fqdn
    ? all.find(record => record.type === 'SRV' && isSameName(record.name, fqdn))
    : undefined;

  if (!srv) return aRecords[0];

  const target = (dataOf(srv) as { target?: unknown } | undefined)?.target;

  if (typeof target !== 'string') return undefined;

  return aRecords.find(record => isSameName(record.name, target));
}

/** The ip and hostname of an A record. */
export function hostDetailsOf(record: MdnsRecord | undefined): MdnsHostDetails | null {
  const ip = dataOf(record);

  if (typeof ip !== 'string') return null;

  return { ip, hostname: (record as MdnsRecord).name };
}

/**
 * The TXT record of the first of `names` that has one, in the answer or additional section. Without one, a TXT
 * record that names no service is used, as before. A TXT record of another service or device is never used, as it
 * would mix their data.
 */
export function findTxtRecord(
  packet: multicastDns.ResponsePacket,
  names: (string | null | undefined)[],
): MdnsRecord | undefined {
  const records = [...section(packet?.answers), ...section(packet?.additionals)].filter(
    record => record.type === 'TXT',
  );

  for (const name of names) {
    const own = name ? records.find(record => isSameName(record.name, name)) : undefined;

    if (own) return own;
  }

  // a name with a `_tcp` or `_udp` label belongs to a service, under any domain
  return records.find(record => !/\._(tcp|udp)(\.|$)/.test(normalizeName(record.name) ?? ''));
}

/** The data of a TXT record as an object, or `null` when it isn't an array of buffers. */
export function parseTxtRecord<TTxtRecord extends object>(
  record: MdnsRecord | undefined,
): TTxtRecord | null {
  const data = dataOf(record);

  if (!isBufferArray(data)) return null;

  return bufferArrayToJSON<TTxtRecord>(data);
}

function normalizeName(name: unknown): string | undefined {
  return typeof name === 'string' ? name.toLowerCase().replace(/\.$/, '') : undefined;
}

/** Whether a name is an instance of the service: `<instance>.<service domain>`. */
function isInstanceOf(name: unknown, serviceDomain: string): boolean {
  const normalized = normalizeName(name);
  const suffix = `.${normalizeName(serviceDomain)}`;

  return (
    normalized !== undefined && normalized.length > suffix.length && normalized.endsWith(suffix)
  );
}

function servicePtrs(packet: multicastDns.ResponsePacket, serviceDomain: string): MdnsRecord[] {
  return section(packet?.answers).filter(
    record => record.type === 'PTR' && isSameName(record.name, serviceDomain),
  );
}

/** The records of a section, leaving out what isn't a record, since the packet comes from the network. */
function section(records: unknown): MdnsRecord[] {
  if (!Array.isArray(records)) return [];

  return records.filter(record => typeof record === 'object' && record !== null);
}

function dataOf(record: MdnsRecord | undefined): unknown {
  return record && 'data' in record ? record.data : undefined;
}
