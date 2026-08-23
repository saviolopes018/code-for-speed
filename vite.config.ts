/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// Rapier ships a WASM file loaded async; Vite handles this out of the box with
// the -compat build. We keep the config intentionally minimal for the MVP.
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
