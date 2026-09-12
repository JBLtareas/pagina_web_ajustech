import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  server: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8799',
        changeOrigin: false,
        secure: false,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8799',
        changeOrigin: false,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
