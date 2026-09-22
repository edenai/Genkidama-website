// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://genkidama.edenai.co',
  output: 'static',
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'auto' },
  vite: {
    build: {
      // Three.js is only shipped inside the scene island; keep it in its own chunk.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('node_modules/gsap')) return 'gsap';
          },
        },
      },
    },
  },
});
