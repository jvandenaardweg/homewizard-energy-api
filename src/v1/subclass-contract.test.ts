import * as multicastDns from 'multicast-dns';
import { Dispatcher } from 'undici';
import { BaseApi, HomeWizardEnergyApiResponseError } from '@/v1/base-api';
import { EnergySocketApi } from '@/v1/energy-socket-api';
import { HomeWizardEnergyDiscovery } from '@/v1/homewizard-energy-discovery';
import { P1MeterApi } from '@/v1/p1-meter-api';

/*
 * The v1 classes are exported and can be subclassed, so the protected methods that the built-in code calls are
 * part of their API: overriding one changes what the public methods do. These tests pin each of those calls.
 *
 * A spy on an instance stands in for an override in a subclass, as the built-in code finds both through `this`.
 */

const onSpy = vi.fn();
const querySpy = vi.fn();

vi.mock('multicast-dns', () => ({
  default: () => ({
    query: querySpy,
    on: onSpy,
    removeAllListeners: vi.fn(),
    destroy: vi.fn(),
  }),
}));

// oxlint-disable-next-line typescript/no-explicit-any
type AnyMethod = (...args: any[]) => any;

/** Overrides the protected method `name` of `target`. */
function override(target: object, name: string) {
  return vi.spyOn(target as Record<string, AnyMethod>, name);
}

/** A response with this status and body, as `request()` returns it. */
function reply(statusCode: number, body: string): Dispatcher.ResponseData<unknown> {
  return {
    statusCode,
    headers: {},
    body: { text: async () => body },
  } as unknown as Dispatcher.ResponseData<unknown>;
}

const url = 'http://192.168.1.35';

/** Each endpoint of the v1 classes, with whether it reads its body as JSON. */
const endpoints: [name: string, create: () => BaseApi, call: AnyMethod, json: boolean][] = [
  ['getBasicInformation', () => new P1MeterApi(url), api => api.getBasicInformation(), true],
  ['getData', () => new P1MeterApi(url), api => api.getData(), true],
  ['getSystem', () => new P1MeterApi(url), api => api.getSystem(), true],
  [
    'updateSystem',
    () => new P1MeterApi(url),
    api => api.updateSystem({ cloud_enabled: false }),
    true,
  ],
  ['identify', () => new EnergySocketApi(url), api => api.identify(), true],
  ['getTelegram', () => new P1MeterApi(url), api => api.getTelegram(), false],
  ['getState', () => new EnergySocketApi(url), api => api.getState(), true],
  ['updateState', () => new EnergySocketApi(url), api => api.updateState({ power_on: true }), true],
];

describe('the protected methods that the v1 endpoints call', () => {
  describe.each(endpoints)('%s()', (_name, create, call, json) => {
    let api: BaseApi;

    beforeEach(() => {
      api = create();
    });

    it('should send the request through request()', async () => {
      const request = override(api, 'request').mockResolvedValue(reply(200, '{"a":1}'));

      await call(api);

      expect(request).toHaveBeenCalledOnce();
      expect(request.mock.calls[0]?.[0]).toMatch(/^http:\/\/192\.168\.1\.35\/api/);
    });

    it('should read the body of an error status that isResponseOk() accepts', async () => {
      override(api, 'request').mockResolvedValue(reply(500, '{"a":1}'));
      const isResponseOk = override(api, 'isResponseOk').mockReturnValue(true);

      await expect(call(api)).resolves.toStrictEqual(json ? { a: 1 } : '{"a":1}');
      expect(isResponseOk).toHaveBeenCalledOnce();
    });

    it('should throw for a status that isResponseOk() rejects', async () => {
      override(api, 'request').mockResolvedValue(reply(200, '{"a":1}'));
      override(api, 'isResponseOk').mockReturnValue(false);

      await expect(call(api)).rejects.toBeInstanceOf(HomeWizardEnergyApiResponseError);
    });

    it('should throw what throwResponseError() throws for an error status', async () => {
      override(api, 'request').mockResolvedValue(reply(500, 'busy'));
      const error = new Error('from the subclass');
      const throwResponseError = override(api, 'throwResponseError').mockRejectedValue(error);

      await expect(call(api)).rejects.toBe(error);
      expect(throwResponseError).toHaveBeenCalledWith(
        expect.stringMatching(/^http:\/\/192\.168\.1\.35\/api/),
        expect.any(String),
        expect.objectContaining({ statusCode: 500 }),
      );
    });

    it.runIf(json)('should return what parseJsonResponse() makes of the body', async () => {
      override(api, 'request').mockResolvedValue(reply(200, 'not JSON'));
      const parseJsonResponse = override(api, 'parseJsonResponse').mockResolvedValue({ b: 2 });

      await expect(call(api)).resolves.toStrictEqual({ b: 2 });
      expect(parseJsonResponse).toHaveBeenCalledWith(
        expect.stringMatching(/^http:\/\/192\.168\.1\.35\/api/),
        expect.any(String),
        expect.objectContaining({ statusCode: 200 }),
      );
    });
  });

  it('should request the URL of the endpoints getter', async () => {
    const api = new P1MeterApi(url);
    const request = override(api, 'request').mockResolvedValue(reply(200, '{"a":1}'));
    Object.defineProperty(api, 'endpoints', { get: () => ({ data: 'http://other/data' }) });

    await api.getData();

    expect(request).toHaveBeenCalledWith('http://other/data', expect.anything());
  });

  it('should log through log()', async () => {
    const api = new P1MeterApi(url);
    override(api, 'request').mockResolvedValue(reply(200, '{"a":1}'));
    const log = override(api, 'log');

    await api.getData();

    expect(log).toHaveBeenCalled();
  });

  it('should parse the body in parseJsonResponse() whatever the status', async () => {
    const api = new P1MeterApi(url);

    await expect(
      api['parseJsonResponse'](`${url}/api/v1/data`, 'GET', reply(500, '{"a":1}')),
    ).resolves.toStrictEqual({ a: 1 });
  });
});

describe('the protected state that v1 polling uses', () => {
  let api: P1MeterApi;
  let request: ReturnType<typeof override>;

  /** Lets pending promise callbacks run, because the fake timers don't advance them. */
  async function flushPromises() {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }

  beforeEach(() => {
    api = new P1MeterApi(url, { polling: { interval: 100 } });
    request = override(api, 'request').mockImplementation(async () => reply(200, '{"a":1}'));
  });

  afterEach(() => {
    api.polling.getData.stop();
  });

  it('should take the on() of polling from pollingOn()', () => {
    const on = vi.fn();
    const pollingOn = override(api, 'pollingOn').mockReturnValue(on);

    expect(api.polling.getData.on).toBe(on);
    expect(pollingOn).toHaveBeenCalledWith('getData');
  });

  it('should start and stop through startPolling() and stopPolling()', () => {
    const startPolling = override(api, 'startPolling').mockResolvedValue(undefined);
    const stopPolling = override(api, 'stopPolling').mockReturnValue(undefined);

    api.polling.getData.start();
    api.polling.getData.stop();

    expect(startPolling).toHaveBeenCalledWith('getData', expect.any(Function));
    expect(stopPolling).toHaveBeenCalledWith('getData');
  });

  it('should poll the method of the subclass', async () => {
    const getData = override(api, 'getData').mockResolvedValue({ b: 2 });
    const listener = vi.fn();

    api.polling.getData.on('response', listener);
    api.polling.getData.start();
    await flushPromises();

    expect(getData).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ b: 2 });
  });

  it('should emit through emitPollingEvent()', async () => {
    const emitPollingEvent = override(api, 'emitPollingEvent');

    api.polling.getData.start();
    await flushPromises();

    expect(emitPollingEvent).toHaveBeenCalledWith('getData', 'response', { a: 1 });
  });

  it('should stop through stopPolling() after an error with stopOnError', async () => {
    const stopping = new P1MeterApi(url, { polling: { stopOnError: true } });
    override(stopping, 'request').mockResolvedValue(reply(500, 'busy'));
    const stopPolling = override(stopping, 'stopPolling');

    stopping.polling.getData.on('error', () => {});
    stopping.polling.getData.start();
    await flushPromises();

    expect(stopPolling).toHaveBeenCalledWith('getData');
  });

  it.each([
    ['cleared', undefined],
    ['replaced by another run', {}],
  ])('should stop the loop once its entry in activePollingRuns is %s', async (_name, entry) => {
    const listener = vi.fn();

    api.polling.getData.on('response', listener);
    api.polling.getData.start();
    await flushPromises();

    expect(request).toHaveBeenCalledOnce();

    api['activePollingRuns'].getData = entry;

    await vi.advanceTimersByTimeAsync(500);

    expect(request).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('should not emit a response that arrives after its entry is cleared', async () => {
    let resolve: (response: Dispatcher.ResponseData<unknown>) => void = () => {};
    request.mockReturnValue(new Promise(r => (resolve = r)));
    const listener = vi.fn();

    api.polling.getData.on('response', listener);
    api.polling.getData.start();
    await flushPromises();

    api['activePollingRuns'].getData = undefined;
    resolve(reply(200, '{"a":1}'));
    await flushPromises();

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('the protected finders that the v1 discovery calls', () => {
  type Record = multicastDns.ResponsePacket['answers'][number];

  const fqdn = 'energysocket-AABB01._hwenergy._tcp.local';
  const txtData = [Buffer.from('product_type=HWE-SKT'), Buffer.from('serial=3c39e7aabb01')];
  const packet = (answers?: Record[]): multicastDns.ResponsePacket => ({
    id: 0,
    type: 'response',
    flags: 1024,
    questions: [],
    answers: answers ?? [
      { name: '_hwenergy._tcp.local', type: 'PTR', ttl: 4500, class: 'IN', data: fqdn },
      {
        name: fqdn,
        type: 'SRV',
        ttl: 120,
        class: 'IN',
        data: { priority: 0, weight: 0, port: 80, target: 'energysocket-AABB01.local' },
      },
      { name: fqdn, type: 'TXT', ttl: 4500, class: 'IN', data: txtData },
    ],
    additionals: [
      {
        name: 'energysocket-AABB01.local',
        type: 'A',
        ttl: 120,
        class: 'IN',
        data: '192.168.1.34',
      },
    ],
    authorities: [],
  });
  const goodbye = () =>
    packet([{ name: '_hwenergy._tcp.local', type: 'PTR', ttl: 0, class: 'IN', data: fqdn }]);
  const device = {
    ip: '192.168.1.34',
    hostname: 'energysocket-AABB01.local',
    fqdn,
    txt: { product_type: 'HWE-SKT', serial: '3c39e7aabb01' },
  };

  let discovery: HomeWizardEnergyDiscovery;
  let callback: (device: unknown) => void;
  let handle: (response: multicastDns.ResponsePacket) => void;

  beforeEach(() => {
    discovery = new HomeWizardEnergyDiscovery();
    callback = vi.fn<(device: unknown) => void>();
    discovery.start();
    discovery.on('response', callback);
    handle = onSpy.mock.calls.at(-1)?.[1];
  });

  afterEach(() => {
    discovery.stop();
  });

  it('should query the domain of the serviceDomain getter', () => {
    Object.defineProperty(discovery, 'serviceDomain', { get: () => '_other._tcp.local' });

    discovery.start();

    expect(querySpy).toHaveBeenLastCalledWith('_other._tcp.local', 'PTR');
  });

  it('should call back with the device without overrides', () => {
    handle(packet());

    expect(callback).toHaveBeenCalledExactlyOnceWith(device);
  });

  it.each(['isServiceResponse', 'isHomeWizardEnergyResponse'])(
    'should ignore a response that %s() rejects',
    name => {
      const finder = override(discovery, name).mockReturnValue(false);

      handle(packet());

      expect(finder).toHaveBeenCalledOnce();
      expect(callback).not.toHaveBeenCalled();
    },
  );

  it('should take the fqdn from getFqdnFromResponse()', () => {
    override(discovery, 'getFqdnFromResponse').mockReturnValue('my-socket');

    handle(packet());

    expect(callback).toHaveBeenCalledExactlyOnceWith({ ...device, fqdn: 'my-socket' });
  });

  it('should ignore a response without an fqdn from getFqdnFromResponse()', () => {
    override(discovery, 'getFqdnFromResponse').mockReturnValue(null);

    handle(packet());

    expect(callback).not.toHaveBeenCalled();
  });

  it('should take the host from getHostDetailsFromResponse()', () => {
    override(discovery, 'getHostDetailsFromResponse').mockReturnValue({
      ip: '10.0.0.1',
      hostname: 'mine.local',
    });

    handle(packet());

    expect(callback).toHaveBeenCalledExactlyOnceWith({
      ...device,
      ip: '10.0.0.1',
      hostname: 'mine.local',
    });
  });

  it('should ignore a response without a host from getHostDetailsFromResponse()', () => {
    override(discovery, 'getHostDetailsFromResponse').mockReturnValue(null);

    handle(packet());

    expect(callback).not.toHaveBeenCalled();
  });

  it('should take the host of the A record from getHostDetailsFromAnswer()', () => {
    const finder = override(discovery, 'getHostDetailsFromAnswer').mockReturnValue({
      ip: '10.0.0.1',
      hostname: 'mine.local',
    });

    handle(packet());

    expect(finder).toHaveBeenCalledWith(expect.objectContaining({ type: 'A' }));
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      ...device,
      ip: '10.0.0.1',
      hostname: 'mine.local',
    });
  });

  it('should take the TXT data from getTxtRecordFromResponse(), with the fqdn', () => {
    const response = packet();
    const finder = override(discovery, 'getTxtRecordFromResponse').mockReturnValue({ a: '1' });

    handle(response);

    expect(finder).toHaveBeenCalledWith(response, fqdn);
    expect(callback).toHaveBeenCalledExactlyOnceWith({ ...device, txt: { a: '1' } });
  });

  it('should ignore a response without TXT data from getTxtRecordFromResponse()', () => {
    override(discovery, 'getTxtRecordFromResponse').mockReturnValue(null);

    handle(packet());

    expect(callback).not.toHaveBeenCalled();
  });

  it('should take the TXT record from findTxtRecord()', () => {
    override(discovery, 'findTxtRecord').mockReturnValue({
      name: fqdn,
      type: 'TXT',
      data: [Buffer.from('a=1')],
    });

    handle(packet());

    expect(callback).toHaveBeenCalledExactlyOnceWith({ ...device, txt: { a: '1' } });
  });

  it('should skip a device that isDiscoveryResponseInCache() has', () => {
    const finder = override(discovery, 'isDiscoveryResponseInCache').mockReturnValue(true);

    handle(packet());

    expect(finder).toHaveBeenCalledWith(device);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should take a goodbye from isGoodbyeResponse()', () => {
    handle(packet());

    const isGoodbyeResponse = override(discovery, 'isGoodbyeResponse').mockReturnValue(true);
    handle(packet());
    isGoodbyeResponse.mockRestore();
    handle(packet());

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should not forget a device that getCachedResponseByFqdn() does not find at a goodbye', () => {
    handle(packet());

    const finder = override(discovery, 'getCachedResponseByFqdn').mockReturnValue(undefined);
    handle(goodbye());
    finder.mockRestore();
    handle(packet());

    expect(callback).toHaveBeenCalledOnce();
  });

  it('should forget a device at a goodbye through removeCachedResponseByFqdn()', () => {
    handle(packet());

    const remove = override(discovery, 'removeCachedResponseByFqdn').mockReturnValue(undefined);
    handle(goodbye());
    expect(remove).toHaveBeenCalledWith(fqdn);
    remove.mockRestore();
    handle(packet());

    expect(callback).toHaveBeenCalledOnce();
  });

  it.each([
    ['response', 'handleMdnsResponse'],
    ['error', 'handleMdnsError'],
    ['warning', 'handleMdnsWarning'],
  ] as const)('should listen to "%s" through %s()', (event, name) => {
    const listener = vi.fn();
    const handler = override(discovery, name).mockReturnValue(listener);

    (discovery.on as (event: string, listener: () => void) => void).call(
      discovery,
      event,
      () => {},
    );

    expect(handler).toHaveBeenCalledOnce();
    expect(onSpy).toHaveBeenLastCalledWith(event, listener);
  });
});
