import { ErrorResponse } from '../types';

export const mockErrorApiNotEnabled: ErrorResponse = {
  error: {
    id: 202,
    description: 'API not enabled',
  },
};

export const mockErrorInvalidJson: ErrorResponse = {
  error: {
    id: 2,
    description: 'Body contains invalid json',
  },
};

export const mockErrorInvalidValue: ErrorResponse = {
  error: {
    id: 7,
    description: 'brightness value limited to 0-255',
  },
};

export const mockErrorSwitchLockEnabled: ErrorResponse = {
  error: {
    id: 8,
    description: 'power_on cannot be turned off when switch_lock is on',
  },
};
