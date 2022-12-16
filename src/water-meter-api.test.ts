import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { mockApiUrl } from '@/mocks/api';
import { Interceptable, MockAgent, setGlobalDispatcher } from 'undici';
import { mockWaterMeterDataResponse } from '@/mocks/data/data';
import { WaterMeterApi } from '@/water-meter-api';

let mockApiAgent: MockAgent;
let mockApiPool: Interceptable;
let waterMeterApi: WaterMeterApi;

const mockBasicResponse = mockBasicInformationResponse['HWE-WTR'];

describe('WaterMeterApi', () => {
  beforeEach(() => {
    waterMeterApi = new WaterMeterApi(mockApiUrl);

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
    expect(waterMeterApi).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();

    const waterMeterApiWithLogger = new WaterMeterApi(mockApiUrl, {
      logger: loggerSpy,
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

    await waterMeterApiWithLogger.getBasicInformation();

    expect(waterMeterApiWithLogger).toBeTruthy();
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

    const basicInformation = await waterMeterApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
  });

  it('should GET the "data" endpoint', async () => {
    mockApiPool
      .intercept({
        path: `/api/v1/data`,
        method: 'GET',
      })
      .reply(() => ({
        data: mockWaterMeterDataResponse,
        statusCode: 200,
      }));

    const data = await waterMeterApi.getData();

    expect(data).toStrictEqual(mockWaterMeterDataResponse);
  });
});
