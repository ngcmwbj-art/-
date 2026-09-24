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
  server: { fs: { allow: ['..'] } },
});
