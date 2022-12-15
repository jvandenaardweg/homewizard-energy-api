import { mockApiUrl } from './mocks/api';

import { Base, HomeWizardEnergyApiError, HomeWizardEnergyApiResponseError } from './base';

let base: Base;

const loggerSpy = vi.fn();

describe('Base', () => {
  beforeEach(() => {
    base = new Base(mockApiUrl, {
      logger: loggerSpy,
    });
  });

  it('should be able to create a new instance', () => {
    expect(base).toBeTruthy();
  });

  it('should create a HomeWizardEnergyApiError instance', () => {
    const error = new HomeWizardEnergyApiError('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HomeWizardEnergyApiError);
    expect(error.message).toBe('Test error');

    expect(error.toString()).toBe('HomeWizardEnergyApiError: Test error');
  });

  it('should create a HomeWizardEnergyApiResponseError instance', () => {
    const error = new HomeWizardEnergyApiResponseError(
      'Test error',
      'http://localhost/api/v1/data',
      500,
      'Test response data',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HomeWizardEnergyApiResponseError);
    expect(error.message).toBe('Test error');
    expect(error.url).toBe('http://localhost/api/v1/data');
    expect(error.statusCode).toBe(500);
    expect(error.response).toBe('Test response data');

    expect(error.toString()).toBe('HomeWizardEnergyApiResponseError: Test error');
  });
});
