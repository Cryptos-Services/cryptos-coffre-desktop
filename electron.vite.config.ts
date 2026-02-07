import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'main/main.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'main'),
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'main/preload.ts'),
        },
      },
    },
  },
  renderer: {
    root: 'renderer',
    plugins: [react()],
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'renderer/index.html'),
        },
      },
    },
  },
});
