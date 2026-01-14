import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    server: mode === 'development' ? {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': 'http://localhost:3001'
      }
    } : undefined
  }
})
