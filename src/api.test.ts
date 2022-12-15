import { HomeWizardEnergyApi } from './api';
import { mockApiUrl } from './mocks/api';

let homeWizardEnergyApi: HomeWizardEnergyApi;

describe('HomeWizardEnergyApi', () => {
  beforeEach(() => {
    homeWizardEnergyApi = new HomeWizardEnergyApi(mockApiUrl);
  });

  it('should create a new instance', () => {
    expect(homeWizardEnergyApi).toBeTruthy();
  });

  it('should create a Energy Socket instance', () => {
    expect(homeWizardEnergyApi.energySocket).toBeTruthy();
  });

  it('should create a P1 Meter instance', () => {
    expect(homeWizardEnergyApi.p1Meter).toBeTruthy();
  });

  it('should create a Water Meter instance', () => {
    expect(homeWizardEnergyApi.waterMeter).toBeTruthy();
  });
});
