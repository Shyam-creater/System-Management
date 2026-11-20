import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://10.30.151.105:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://10.30.151.105:5000',
        ws: true
      }
    }
  }
});
