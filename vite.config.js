import { defineConfig } from 'vite'
import { crx } from 'vite-plugin-chrome-extension'

export default defineConfig({
  plugins: [crx({ manifest: './manifest.json' })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
  },
}) 