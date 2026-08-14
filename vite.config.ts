import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
    server: {
<<<<<<< HEAD
    host: '10.1.205.120',    
    port: 5174,
=======
    host: '10.1.205.126',
    port: 5173,
>>>>>>> 468efdba209500ba04d5ee9e1778dd63834c4f3c
  }
})
