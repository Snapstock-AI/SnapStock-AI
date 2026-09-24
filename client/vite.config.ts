import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/',
  envDir: path.resolve(__dirname, '..'),
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    // React's production build has no act(); force the dev build even if the shell exports NODE_ENV=production.
    env: { NODE_ENV: 'test' },
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
