import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4174,
  },
});
