import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const foodSrc = path.resolve(__dirname, './src/modules/Food')
const servicesApi = path.resolve(__dirname, './src/services/api')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      // Food module aliases
      '@food/api/axios': path.resolve(servicesApi, 'axios.js'),
      '@food/api/config': path.resolve(servicesApi, 'config.js'),
      '@food/api': servicesApi,
      '@food': foodSrc,

      // Main source alias
      '@': path.resolve(__dirname, './src'),
    },

    dedupe: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
  },

  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/x-date-pickers',
    ],
  },

  server: {
    host: '0.0.0.0',
    port: 5173,

    proxy: {
      '/api/v1': {
        target:
          process.env.VITE_BACKEND_PROXY_TARGET ||
          'http://localhost:5000',

        changeOrigin: true,
        secure: false,
      },
    },
  },
})