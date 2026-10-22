import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const ruta = (carpeta) => fileURLToPath(new URL(carpeta, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': ruta('./src/core'),
      '@features': ruta('./src/features'),
      '@shared': ruta('./src/shared'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**', 'src/**/*.test.{js,jsx}'],
      // lcov con rutas desde la raíz del repositorio (frontend/src/...) para SonarCloud
      reporter: ['text', 'html', ['lcov', { projectRoot: '..' }]],
      reportsDirectory: 'coverage',
    },
  },
})