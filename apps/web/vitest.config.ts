import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@leaf/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      '@zag-js/focus-visible': fileURLToPath(new URL('./src/test/mocks/zagFocusVisible.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
  },
});
