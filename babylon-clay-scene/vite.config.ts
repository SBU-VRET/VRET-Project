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
    // Force Vite to pre-bundle these as single units instead of resolving each
    // deep import path (e.g. "@babylonjs/core/Maths/math.vector") as its own
    // separate dev-server module. Without this, Babylon's internal singletons
    // (like Effect.ShadersStore) can end up duplicated across two module
    // instances — one registers a shader via a side-effect import, the other
    // (used by PostProcess/Effect internals) can't find it and falls back to
    // fetching it over HTTP, which 404s to index.html and gets fed to the GLSL
    // compiler as shader source ("FRAGMENT SHADER ERROR: '<' syntax error").
    include: ["@babylonjs/core", "@babylonjs/loaders", "@babylonjs/materials", "@babylonjs/gui", "@babylonjs/addons"],
  },
  build: {
    target: 'esnext',
  },
});
