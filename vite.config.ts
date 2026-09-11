import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Firebase + Ionic are large by nature; the warning adds no value here.
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 8100,
    host: true,
  },
});
