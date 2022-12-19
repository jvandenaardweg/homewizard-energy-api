import { setGlobalDispatcher } from 'undici';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { mockApiAgent } from './src/mocks/api';

beforeAll(() => {
  setGlobalDispatcher(mockApiAgent);
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.runAllTimers();
  vi.useRealTimers();
});

afterAll(async () => {
  await mockApiAgent.close();
});
