/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Deployed under a project subpath on GitHub Pages; overridable via env for other hosts.
  base: process.env.VITE_BASE_PATH ?? '/',
  worker: {
    format: 'es',
  },
  test: {
    globals: true,
    // The engine and store are pure logic — no DOM needed, so we default to the
    // fast `node` environment. Any future component test can opt into jsdom with
    // a `// @vitest-environment jsdom` file-level pragma.
    environment: 'node',
    // The `forks` pool is the most reliable across platforms (notably Windows),
    // avoiding worker-thread startup flakiness.
    pool: 'forks',
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/engine/**', 'src/store/**'],
    },
  },
});
