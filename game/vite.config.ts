import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 4000,
    // One bundle: the Artifact build inlines it into a single HTML page.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  // NO_HMR=1: the shared QA server — several teams save files while others
  // take screenshots, and a hot reload in the middle breaks their runs.
  server: { fs: { allow: ['..'] }, hmr: process.env.NO_HMR ? false : undefined },
});
