import { MockAgent } from 'undici';

/*
 * The global undici dispatcher of every test, set in `vitest.setup.ts`, with the network disabled. The API v1 and
 * API v2 mocks both add their interceptors to it.
 */
export const mockApiAgent = new MockAgent({
  bodyTimeout: 10,
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10,
});

mockApiAgent.disableNetConnect();
