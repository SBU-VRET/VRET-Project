import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// GitHub Pages serves this repo at https://sbu-vret.github.io/VRET-Project/,
// not the root, so production builds need that path prefixed onto every asset
// URL. Local dev (npm run dev) stays at root. Set by the deploy workflow.
const base = process.env.GITHUB_PAGES ? '/VRET-Project/' : '/';

export default defineConfig({
  base,
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
