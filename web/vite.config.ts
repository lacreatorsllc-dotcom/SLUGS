import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the root of slugs.run. BASE_PATH is only for serving it from a sub-path.
// On Vercel, /data/*.json is api/data.js; locally it's proxied to the copy that falls back to.
// API=https://www.slugs.run npm run dev also sends /api (sign-in, invites, data) to that site,
// so you can sign in locally by pasting the sign-in link from Baum on the invite page.
const data = {
  ...(process.env.PNL_API ? { '/api/pnl': { target: process.env.PNL_API, changeOrigin: true } } : {}),
  '/data': {
    target: 'https://gumdropsteve.github.io',
    changeOrigin: true,
    rewrite: (path: string) => `/agent-trading-platform${path}`,
  },
  ...(process.env.API ? { '/api': { target: process.env.API, changeOrigin: true } } : {}),
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { proxy: data },
  preview: { proxy: data },
})
