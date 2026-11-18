import { ErrorResponse } from '@/v1/types';

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

// The device's router answers a path it doesn't know, like /api/v1/state on a HWE-P1, with this text/html body
export const mockErrorNotFound = 'Nothing matches the given URI';

// The device's router answers a method an endpoint doesn't accept, like GET on /api/v1/identify, with this text/html body
export const mockErrorMethodNotAllowed = 'Specified method is invalid for this resource';
