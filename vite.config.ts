import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { phoneUploadPlugin } from './scripts/phone-upload';

export default defineConfig({
  plugins: [react(), phoneUploadPlugin()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ['maplibre-gl'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/coverage/**', '**/dist/**'],
    },
  },
});
