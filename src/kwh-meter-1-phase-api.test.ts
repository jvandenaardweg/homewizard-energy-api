import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { mockApiUrl } from '@/mocks/api';
import { Interceptable, MockAgent, setGlobalDispatcher } from 'undici';
import { mockKwhMeter1PhaseResponse } from '@/mocks/data/data';
import { KwhMeter1PhaseApi } from '@/kwh-meter-1-phase-api';

let mockApiAgent: MockAgent;
let mockApiPool: Interceptable;
let kwhMeter1PhaseApi: KwhMeter1PhaseApi;

const mockBasicResponse = mockBasicInformationResponse['SDM230-wifi'];

describe('KwhMeter1PhaseApi', () => {
  beforeEach(() => {
    kwhMeter1PhaseApi = new KwhMeter1PhaseApi(mockApiUrl);

    mockApiAgent = new MockAgent({
      bodyTimeout: 10,
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10,
    });

    mockApiAgent.disableNetConnect();

    setGlobalDispatcher(mockApiAgent);

    mockApiPool = mockApiAgent.get(mockApiUrl);
  });

  afterEach(async () => {
    await mockApiAgent.close();
  });

  it('should be able to create a new instance', () => {
    expect(kwhMeter1PhaseApi).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();

    const kwhMeter1PhaseApiWithLogger = new KwhMeter1PhaseApi(mockApiUrl, {
      logger: {
        method: loggerSpy,
      },
    });

    mockApiPool
      .intercept({
        path: '/api',
        method: 'GET',
      })
      .reply(() => ({
        data: mockBasicResponse,
        statusCode: 200,
      }));

    await kwhMeter1PhaseApiWithLogger.getBasicInformation();

    expect(kwhMeter1PhaseApiWithLogger).toBeTruthy();
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should GET the "basic" endpoint', async () => {
    mockApiPool
      .intercept({
        path: '/api',
        method: 'GET',
      })
      .reply(() => ({
        data: mockBasicResponse,
        statusCode: 200,
      }));

    const basicInformation = await kwhMeter1PhaseApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
  });

  it('should GET the "data" endpoint', async () => {
    mockApiPool
      .intercept({
        path: `/api/v1/data`,
        method: 'GET',
      })
      .reply(() => ({
        data: mockKwhMeter1PhaseResponse,
        statusCode: 200,
      }));

    const data = await kwhMeter1PhaseApi.getData();

    expect(data).toStrictEqual(mockKwhMeter1PhaseResponse);
  });
});
