import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        },
        manifest: {
          name: 'CheckDrive',
          short_name: 'CheckDrive',
          description: 'Sua frota conectada, segura e eficiente',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg',
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: 'https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg',
              sizes: '512x512',
              type: 'image/jpeg'
            },
            {
              src: 'https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any maskable'
            },
            {
              src: 'https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
