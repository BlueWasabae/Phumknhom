import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['assets/khmer/buildings/khmer_stilt_house.png'],
      manifest: {
        name: 'ភូមិខ្ញុំ (Phum Khnhom)',
        short_name: 'Phum Khnhom',
        description:
          '2D Cambodian Social Farming Plaza, Khmer Classes, 50-Floor Pagoda Tower & Co-op Mythic Boss Raid RPG.',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        theme_color: '#1c1410',
        background_color: '#1c1410',
        categories: ['games', 'entertainment', 'social'],
        icons: [
          {
            src: '/assets/khmer/buildings/khmer_stilt_house.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/assets/khmer/buildings/khmer_stilt_house.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/, /^\/sw\.js$/, /^\/manifest\.webmanifest$/],
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'phum-khnhom-assets-v1',
              expiration: {
                maxEntries: 240,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  cacheDir: process.platform === 'win32' && !process.env.CI ? 'E:/temp/vite-phum-cache' : undefined,
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
