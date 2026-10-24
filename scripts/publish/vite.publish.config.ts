import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The build that is published as the playable page (`npm run build:publish`): relative paths, readable
// (not minified), the game in assets/game.js and the libraries in assets/libs.js, and every image under
// its own name. The npm script then puts the hand-written page (scripts/publish/index.html) over the
// index.html Vite writes. Output: dist-publish/ at the repo root (gitignored).
const repo = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  root: repo,
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': repo } },
  build: {
    outDir: fileURLToPath(new URL('../../dist-publish', import.meta.url)),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/game.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
        manualChunks: (id: string) => (id.includes('node_modules') ? 'libs' : undefined),
      },
    },
  },
});
