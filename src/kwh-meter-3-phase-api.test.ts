import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { mockApiUrl } from '@/mocks/api';
import { Interceptable, MockAgent, setGlobalDispatcher } from 'undici';
import { mockKwhMeter3PhaseResponse } from '@/mocks/data/data';
import { KwhMeter3PhaseApi } from '@/kwh-meter-3-phase-api';

let mockApiAgent: MockAgent;
let mockApiPool: Interceptable;
let kwhMeter3PhaseApi: KwhMeter3PhaseApi;

const mockBasicResponse = mockBasicInformationResponse['SDM630-wifi'];

describe('WaterMeterApi', () => {
  beforeEach(() => {
    kwhMeter3PhaseApi = new KwhMeter3PhaseApi(mockApiUrl);

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
    expect(kwhMeter3PhaseApi).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();

    const kwhMeter1PhaseApiWithLogger = new KwhMeter3PhaseApi(mockApiUrl, {
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

    const basicInformation = await kwhMeter3PhaseApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
  });

  it('should GET the "data" endpoint', async () => {
    mockApiPool
      .intercept({
        path: `/api/v1/data`,
        method: 'GET',
      })
      .reply(() => ({
        data: mockKwhMeter3PhaseResponse,
        statusCode: 200,
      }));

    const data = await kwhMeter3PhaseApi.getData();

    expect(data).toStrictEqual(mockKwhMeter3PhaseResponse);
  });
});
