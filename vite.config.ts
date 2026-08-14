import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { getIP } from './src/utils/Tool.ts'

export default defineConfig({
  plugins: [react()],
    server: {
    host: '10.1.205.120',    
    port: 5174,
  }
})
