import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',

  // Разрешаем Vite подхватывать переменные CODEJUDGE_* из системного окружения
  // и делать их доступными через import.meta.env.CODEJUDGE_*
  envPrefix: ['VITE_', 'CODEJUDGE_'],

  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: [
      'all',
      '.manus.computer',
      'localhost',
    ],

    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
