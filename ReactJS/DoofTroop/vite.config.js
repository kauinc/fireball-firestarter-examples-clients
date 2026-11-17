import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: ['fireball-fireworks-sdk-client', '@microsoft/signalr'],
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/livekit-client')) return 'livekit'
          if (id.includes('node_modules/@livekit')) return 'livekit-react'
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('fireball-fireworks-sdk-client')) return 'fireball'
          if (id.includes('node_modules/@microsoft/signalr')) return 'signalr'
        },
      },
    },
  },
  server: {
    proxy: {
      // Dashboard token API has no CORS — proxy it in dev
      '/api/livekit-token': {
        target: 'https://dtdashboard-nine.vercel.app',
        changeOrigin: true,
      },
    },
  },
})
