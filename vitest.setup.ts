import { setGlobalDispatcher } from 'undici';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { mockApiAgent } from './src/mocks/agent';

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
