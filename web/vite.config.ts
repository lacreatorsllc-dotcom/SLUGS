import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the root of slugs.run. BASE_PATH is only for serving it from a sub-path.
// On Vercel, /data/*.json is api/data.js; locally it's proxied to the copy that falls back to.
const data = {
  '/data': {
    target: 'https://gumdropsteve.github.io',
    changeOrigin: true,
    rewrite: (path: string) => `/agent-trading-platform${path}`,
  },
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { proxy: data },
  preview: { proxy: data },
})
