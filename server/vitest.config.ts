import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@kritis/shared': resolve(__dirname, '../shared/src'),
    },
  },
});
