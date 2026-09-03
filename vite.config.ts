import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://js.org
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
