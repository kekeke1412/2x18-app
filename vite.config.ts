import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createDevApi } from './server/devApi.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'local-ai-api',
    configureServer(server) {
      // Server-only values never enter Vite's client define/import.meta.env.
      server.middlewares.use(createDevApi({ ...loadEnv(mode, process.cwd(), ''), ...process.env }));
    },
  }],
}))
