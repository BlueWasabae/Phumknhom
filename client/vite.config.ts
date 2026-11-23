import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  cacheDir: 'E:/temp/vite-phum-cache',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: ['**/*.crdownload', '**/*.part', '**/*.tmp', '**/public/assets/packs/**'],
    },
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  build: {
    target: 'esnext',
  },
});
