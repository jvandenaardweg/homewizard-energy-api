import { mockBasicInformationResponse } from '@/mocks/data/basic';

import { apiMocks, mockApiUrl } from '@/mocks/api';
import { mockKwhMeter1PhaseResponse } from '@/mocks/data/data';
import { KwhMeter1PhaseApi } from '@/kwh-meter-1-phase-api';

let kwhMeter1PhaseApi: KwhMeter1PhaseApi;

const mockBasicResponse = mockBasicInformationResponse['SDM230-wifi'];

describe('KwhMeter1PhaseApi', () => {
  beforeEach(() => {
    kwhMeter1PhaseApi = new KwhMeter1PhaseApi(mockApiUrl);
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

    const basicInformation = await kwhMeter1PhaseApi.getBasicInformation();

    expect(basicInformation).toStrictEqual(mockBasicResponse);
  });

  it('should GET the "data" endpoint', async () => {
    apiMocks.getData({
      response: mockKwhMeter1PhaseResponse,
    });

    const data = await kwhMeter1PhaseApi.getData();

    expect(data).toStrictEqual(mockKwhMeter1PhaseResponse);
  });

  it('should start polling getData when start() is invoked', async () =>
    new Promise(done => {
      apiMocks.getData({
        response: mockKwhMeter1PhaseResponse,
      });

      kwhMeter1PhaseApi.polling.getData.start();

      kwhMeter1PhaseApi.polling.getData.on('response', response => {
        expect(response).toStrictEqual(mockKwhMeter1PhaseResponse);
        done(mockKwhMeter1PhaseResponse);
      });
    }));
});
