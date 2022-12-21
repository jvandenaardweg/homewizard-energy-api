import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { apiMocks, mockApiUrl } from '@/mocks/api';
import { mockKwhMeter3PhaseResponse } from '@/mocks/data/data';
import { KwhMeter3PhaseApi } from '@/kwh-meter-3-phase-api';

let kwhMeter3PhaseApi: KwhMeter3PhaseApi;

const mockBasicResponse = mockBasicInformationResponse['SDM630-wifi'];

describe('WaterMeterApi', () => {
  beforeEach(() => {
    kwhMeter3PhaseApi = new KwhMeter3PhaseApi(mockApiUrl);
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

    apiMocks.getBasicInformation({
      response: mockBasicResponse,
    });

    await kwhMeter1PhaseApiWithLogger.getBasicInformation();

    expect(kwhMeter1PhaseApiWithLogger).toBeTruthy();
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should GET the "basic" endpoint', async () => {
    apiMocks.getBasicInformation({
      response: mockBasicResponse,
    });

    const basicInformation = await kwhMeter3PhaseApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
  });

  it('should GET the "data" endpoint', async () => {
    apiMocks.getData({
      response: mockKwhMeter3PhaseResponse,
    });

    const data = await kwhMeter3PhaseApi.getData();

    expect(data).toStrictEqual(mockKwhMeter3PhaseResponse);
  });
});
