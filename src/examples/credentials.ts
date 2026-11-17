import type { Credentials } from '..';

/**
 * Reads the credentials that src/examples/pair.ts prints from the environment:
 * HOMEWIZARD_HOST=<host> HOMEWIZARD_TOKEN=<token> HOMEWIZARD_IDENTIFIER=<identifier> npx tsx src/examples/p1-meter.ts
 */
export function credentialsFromEnv(defaultHost: string): Credentials {
  const { HOMEWIZARD_HOST, HOMEWIZARD_TOKEN, HOMEWIZARD_IDENTIFIER } = process.env;

  if (!HOMEWIZARD_TOKEN || !HOMEWIZARD_IDENTIFIER) {
    throw new Error(
      'Set HOMEWIZARD_TOKEN and HOMEWIZARD_IDENTIFIER: run src/examples/pair.ts first, which prints them',
    );
  }

  return {
    host: HOMEWIZARD_HOST || defaultHost,
    token: HOMEWIZARD_TOKEN,
    identifier: HOMEWIZARD_IDENTIFIER,
  };
}
