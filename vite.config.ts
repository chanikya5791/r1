/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the APIs run on their own ports; the same /api/* paths are proxied by nginx in production.
const target = (envName: string, fallback: string) => process.env[envName] ?? fallback;
const strip = (prefix: string) => (path: string) => path.replace(new RegExp(`^${prefix}`), '');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/users': { target: target('USERS_API_URL', 'http://localhost:3001'), rewrite: strip('/api/users') },
      '/api/catalog': { target: target('CATALOG_API_URL', 'http://localhost:3003'), rewrite: strip('/api/catalog') },
      '/api/orders': { target: target('ORDERS_API_URL', 'http://localhost:3002'), rewrite: strip('/api/orders') },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,
  },
});
