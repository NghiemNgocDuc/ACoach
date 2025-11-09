import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],
  root: './client',
  build: {
    outDir: '../dist',
    rollupOptions: {
      external: (id) => {
        
        return id.startsWith('@mediapipe/')
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
})
