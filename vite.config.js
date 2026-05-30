import { defineConfig } from 'vite'
import riot from 'rollup-plugin-riot'

export default defineConfig({
  plugins: [riot()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  build: {
    outDir: 'dist'
  }
})
