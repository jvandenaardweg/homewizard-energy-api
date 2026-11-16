import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

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
      all: true,
      include: ['src/**'],
      exclude: ['**/vitest.setup.ts', '**/mocks/**', '**/examples/**'],
      reporter: ['text'],
    },
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      },
    ],
  },
});
