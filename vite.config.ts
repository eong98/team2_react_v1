import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
<<<<<<< HEAD
  plugins: [react()],
})
=======
  plugins: [
    react(),
  ],
    server: {
      host: "10.1.205.119",
      port:5174
    }
})
>>>>>>> 2dccbdc6ca40da3bb6f60a11ad8d6e45d5bb933c
