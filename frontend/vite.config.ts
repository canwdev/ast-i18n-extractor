import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'ast-i18n-extractor': path.resolve(__dirname, '../src/index.ts'),
      // polyfill for some node modules if needed
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  define: {
    // Some libraries might check process.env
    'process.env': {},
  },
})
