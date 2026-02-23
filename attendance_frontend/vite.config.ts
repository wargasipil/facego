import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all ConnectRPC / gRPC-Web paths to the backend.
      // Matches /grades.v1, /classes.v1, /users.v1, /attendance.v1, etc.
      '^/(grades|classes|users|attendance|teachers|whatsapp)\\.v[0-9]+': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
