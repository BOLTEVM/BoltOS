import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
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
      '@boltwallet/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@open-wallet-standard/core': path.resolve(__dirname, './src/ows/ows-core.ts'),
    },
  },
  define: {
    'process.env': {},
    'process.platform': '"win32"',
    'process.arch': '"x64"',
  },
});
