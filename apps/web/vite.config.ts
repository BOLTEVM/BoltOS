import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@open-wallet-standard/core': path.resolve(__dirname, './src/ows/ows-core.ts'),
    },
  },
  define: {
    'process.env': {},
    'process.platform': '"win32"',
    'process.arch': '"x64"',
  },
});
