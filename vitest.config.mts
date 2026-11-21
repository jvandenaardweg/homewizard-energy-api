import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Agent worktrees under .claude/ hold other checkouts of this repo.
    // Relative to the project root, so tests still run when this checkout is itself under .claude/.
    exclude: [...configDefaults.exclude, '.claude/**'],
    coverage: {
      provider: 'istanbul',
      // Since vitest 4, `include` alone decides which files the report counts, tested or not
      include: ['src/**'],
      exclude: ['**/mocks/**', '**/examples/**'],
      reporter: ['text'],
    },
  },
  resolve: {
    alias: [
      // The examples import the package by its name, as users do
      {
        find: /^homewizard-energy-api$/,
        replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      },
      {
        find: /^homewizard-energy-api\/v1$/,
        replacement: fileURLToPath(new URL('./src/v1/index.ts', import.meta.url)),
      },
      {
        find: /^homewizard-energy-api\/telegram$/,
        replacement: fileURLToPath(new URL('./src/telegram/index.ts', import.meta.url)),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
    ],
  },
});
