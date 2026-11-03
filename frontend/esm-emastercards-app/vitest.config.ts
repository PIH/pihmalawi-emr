import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      // Flowsheets render in iframes; tests check their src, so don't load them.
      happyDOM: { settings: { disableIframePageLoading: true } },
    },
    globals: true,
    mockReset: true,
    setupFiles: ['./tools/setup-tests.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
    server: {
      deps: {
        inline: [/@openmrs/],
      },
    },
    alias: {
      '@openmrs/esm-framework/src/internal': '@openmrs/esm-framework/mock',
      '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
      'react-i18next': new URL('./__mocks__/react-i18next.js', import.meta.url).pathname,
    },
  },
});
