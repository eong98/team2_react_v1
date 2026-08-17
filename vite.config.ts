import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
    server: {
    host: '192.168.68.101',    
    port: 5174,
  }
})
