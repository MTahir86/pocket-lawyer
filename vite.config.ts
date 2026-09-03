import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://js.org
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Agar index.html src folder ke andar hai to yeh line kaam karegi
        main: resolve(__dirname, 'src/index.html'), 
      },
    },
  },
})
