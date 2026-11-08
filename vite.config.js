import { defineConfig } from 'vite';
import { resolve } from 'path';

// Vite root is the repo root so that starter-widget/, data/, and mock-platform/
// are all accessible. The mock platform pages live under mock-platform/.
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3002,
    strictPort: true,
    hmr: false,
  },
  build: {
    rollupOptions: {
      input: {
        portal: resolve(__dirname, 'index.html'),
        intervention: resolve(__dirname, 'intervention/index.html'),
        website: resolve(__dirname, 'demo/index.html'),
        reactExample: resolve(__dirname, 'packages/react/example/index.html'),
        main: resolve(__dirname, 'mock-platform/index.html'),
        search: resolve(__dirname, 'mock-platform/search.html'),
      },
    },
  },
});
