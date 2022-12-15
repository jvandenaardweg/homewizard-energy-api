import { mockBasicInformationResponse } from './mocks/data/basic';

import { mockApiUrl } from './mocks/api';
import { Interceptable, MockAgent, setGlobalDispatcher } from 'undici';
import { mockP1MeterDataResponse } from './mocks/data/data';
import { mockTelegramResponse } from './mocks/data/telegram';
import { P1MeterApi } from './p1-meter-api';

let mockApiAgent: MockAgent;
let mockApiPool: Interceptable;
let p1MeterApi: P1MeterApi;

describe('HomeWizardEnergyApi', () => {
  beforeEach(() => {
    p1MeterApi = new P1MeterApi(mockApiUrl);

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
    expect(p1MeterApi).toBeTruthy();
  });

  it('should trigger the logger when doing requests', async () => {
    const loggerSpy = vi.fn();

    const p1MeterApiWithLogger = new P1MeterApi(mockApiUrl, {
      logger: loggerSpy,
    });

    mockApiPool
      .intercept({
        path: '/api',
        method: 'GET',
      })
      .reply(() => ({
        data: mockBasicInformationResponse,
        statusCode: 200,
      }));

    await p1MeterApiWithLogger.getBasicInformation();

    expect(p1MeterApiWithLogger).toBeTruthy();
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should GET the "basic" endpoint', async () => {
    mockApiPool
      .intercept({
        path: '/api',
        method: 'GET',
      })
      .reply(() => ({
        data: mockBasicInformationResponse,
        statusCode: 200,
      }));

    const basicInformation = await p1MeterApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicInformationResponse);
  });

  it('should GET the "data" endpoint', async () => {
    mockApiPool
      .intercept({
        path: `/api/v1/data`,
        method: 'GET',
      })
      .reply(() => ({
        data: mockP1MeterDataResponse,
        statusCode: 200,
      }));

    const data = await p1MeterApi.getData();

    expect(data).toStrictEqual(mockP1MeterDataResponse);
  });

  it('should GET the "telegram" endpoint', async () => {
    mockApiPool
      .intercept({
        path: `/api/v1/telegram`,
        method: 'GET',
      })
      .reply(() => ({
        data: mockTelegramResponse,
        statusCode: 200,
      }));

    const data = await p1MeterApi.getTelegram();

    expect(data).toStrictEqual(mockTelegramResponse);
  });

  it('should throw an error on GET when the "telegram" endpoint returns a server error', async () => {
    mockApiPool
      .intercept({
        path: `/api/v1/telegram`,
        method: 'GET',
      })
      .reply(() => ({
        data: 'Server error!',
        statusCode: 500,
      }));

    const responseFn = () => p1MeterApi.getTelegram();

    expect(responseFn()).rejects.toThrowError(
      'Api GET call at http://localhost/api/v1/telegram failed with status 500 and response data: Server error!',
    );
  });
});
