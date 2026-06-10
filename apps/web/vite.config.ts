import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@soyte/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@soyte/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // PERF FIX: chunk splitting — avoids one giant bundle
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — rarely changes, long-lived cache
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data layer — shared across all features
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          // Forms & validation
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Charts (heavy — lazy-loaded separately)
          'vendor-charts': ['recharts'],
          // Map (heavy — only in specific pages)
          'vendor-maps': ['leaflet', 'react-leaflet'],
          // Export libraries (heavy — only on demand)
          'vendor-export': ['jspdf', 'docx', 'file-saver'],
        },
      },
    },
    // Warn on chunks > 500KB
    chunkSizeWarningLimit: 500,
  },
})
