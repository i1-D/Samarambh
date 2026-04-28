import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/Samarambh/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        gallery: resolve(__dirname, 'gallery.html'),
        faq: resolve(__dirname, 'samarambh-faq.html'),
      },
    },
  },
});
