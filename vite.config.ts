import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
    server: {
<<<<<<< HEAD
    host: '10.1.205.120',    
=======
    host: '192.168.68.101',    
>>>>>>> 8e479dfb6311e496baa56fad92fc9e866fb70766
    port: 5174,
  }
})
