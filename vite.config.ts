import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
<<<<<<< HEAD
  plugins: [react()],
    server: {
    host: '10.1.205.120',    
    port: 5174,
=======
  plugins: [
    react(),
  ],
  server: {
    host: '10.1.205.119',
    port: 5174
>>>>>>> 4286595212cbc77332083da79b3a2ae29b31766c
  }
})
