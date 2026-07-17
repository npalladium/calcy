import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

// Build stamp shown in the footer. The CalVer version is the single source of
// truth in package.json; the short commit is read from git so a deployed build
// can be traced back to its source. Both are baked in at build time via
// `define`; a missing git checkout falls back to 'dev'.
function appVersion(): string {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  return pkg.version;
}
function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify(appVersion()),
    __BUILD_SHA__: JSON.stringify(gitSha())
  },
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      // The site is hosted under a subpath (GitHub Pages: /calcy/). The app's
      // own asset URLs are relative (kit.paths.relative), but the generated
      // service worker still needs the deploy base to precache the prerendered
      // index and to bind its navigation fallback — otherwise both default to
      // the origin root "/", which 404s under the subpath and silently fails SW
      // install (no offline). This base is used ONLY for SW URL generation.
      kit: { base: '/calcy/' },
      registerType: 'autoUpdate',
      manifest: {
        name: 'Calcy',
        short_name: 'Calcy',
        description: 'Unit-aware, uncertainty-propagating notepad calculator',
        display: 'standalone',
        theme_color: '#8100ff',
        background_color: '#0b0b0f',
        icons: [
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,wasm}'] }
    })
  ],
  // sqlite-wasm ships its own worker assets; don't let Vite try to pre-bundle them.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts']
  }
});
