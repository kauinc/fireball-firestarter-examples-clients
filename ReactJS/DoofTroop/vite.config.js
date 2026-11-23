import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localSdk = path.resolve(
  __dirname,
  '../../../fireball-fireworks-sdk-client-javascript',
)

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    // Prefer monorepo SDK so CurrencyHelper / Translation land without npm publish.
    alias: {
      'fireball-fireworks-sdk-client': path.join(localSdk, 'src/index.js'),
    },
  },
  optimizeDeps: {
    include: ['@microsoft/signalr'],
    exclude: ['fireball-fireworks-sdk-client'],
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/livekit-client')) return 'livekit'
          if (id.includes('node_modules/@livekit')) return 'livekit-react'
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('fireball-fireworks-sdk-client-javascript')) {
            return 'fireball'
          }
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
