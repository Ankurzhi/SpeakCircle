import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using @vitejs/plugin-react (Babel-based). Warnings about esbuild/oxc are
// informational only — they do not affect functionality. To silence them,
// you can later switch to: npm install -D @vitejs/plugin-react-oxc

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy REST API calls to backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy Socket.IO during development
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxy
      },
    },
  },
})