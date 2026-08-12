import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
    server: {
<<<<<<< HEAD
    host: '10.1.205.120',    
=======
    host: '10.1.205.118',    
>>>>>>> c88a47f (매장 도면 관리 기능 구현)
    port: 5174,
  }
})