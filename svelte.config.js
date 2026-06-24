import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Pure client-side SPA: prerender the shell (index.html, with relative
		// asset paths so it works at any base path — e.g. GitHub Pages' /calcy/),
		// and fall back to 404.html for client-routed deep links. Keeping the
		// fallback name distinct from index.html preserves the prerendered page.
		adapter: adapter({ fallback: '404.html', precompress: false }),
		paths: { relative: true }
	}
};

export default config;
