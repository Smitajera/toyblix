import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Forces Vite to actively watch for file changes
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-redux', 'react-hot-toast', 'react-is'],
          // Redux toolkit
          'vendor-redux': ['@reduxjs/toolkit'],
          // Three.js (very heavy)
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          // Animation
          'vendor-motion': ['framer-motion'],
          // Charts
          'vendor-charts': ['recharts'],
          // UI
          'vendor-ui': ['swiper', 'lucide-react'],
          // Sentry monitoring
          'vendor-sentry': ['@sentry/react', '@sentry/browser'],
        }
      }
    }
  }
})