import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://js.org
export default defineConfig({
  plugins: [react()],
  root: './', // Forcefully setting root directory
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
