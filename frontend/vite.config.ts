import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.resolve(fileURLToPath(import.meta.url), '..', '..')
const appVersion = (JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf-8')) as { version: string }).version

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'html-title-version',
      transformIndexHtml(html) {
        return html.replace(
          /<title>.*?<\/title>/,
          `<title>AST I18n Extractor v${appVersion}</title>`,
        )
      },
    },
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
    '__APP_VERSION__': JSON.stringify(appVersion),
  },
})
