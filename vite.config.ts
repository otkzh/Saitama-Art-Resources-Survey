import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  root: 'web',
  base: './',
  plugins: [vue()],
  build: { outDir: '../dist/production', emptyOutDir: true, sourcemap: false },
});
