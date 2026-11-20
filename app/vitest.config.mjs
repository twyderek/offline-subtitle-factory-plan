import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/errors.mjs',
        'lib/settings.mjs',
        'lib/utils.mjs',
        'lib/job-manager.mjs',
        'lib/logger.mjs',
      ],
      exclude: ['electron/**', 'public/**', 'scripts/**'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': '.',
    },
  },
});
