import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// APP_BASE：部署在子路径时使用，例如 APP_BASE=/hello-boy/ npm run build
export default defineConfig({
  base: process.env.APP_BASE || '/',
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4173' },
  },
  build: { outDir: 'dist' },
})
