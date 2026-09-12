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
    rollupOptions: {
      output: {
        /**
         * Peels the Firebase SDK out of the start-up chunk so the iOS web view
         * compiles it as its own script.
         *
         * Deliberately nothing else: Ionic ships its own lazily loaded
         * component chunks, and forcing those into one manual chunk flattens
         * that splitting and makes the build bigger, not smaller.
         */
        manualChunks(id) {
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 8100,
    host: true,
  },
});
