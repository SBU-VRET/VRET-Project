import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 3000,
    watch: {
      // public/models/ holds the full valid-vrm-avatars library (~13GB, 199 files) —
      // static assets that never change during dev, no reason to watch them.
      ignored: ['**/public/models/**'],
    },
  },
  optimizeDeps: {
    exclude: ["@babylonjs/havok"],
  },
  build: {
    target: 'esnext',
  },
});
