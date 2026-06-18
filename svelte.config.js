import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Pure client-side SPA: prerender the shell, fall back to index.html.
		adapter: adapter({ fallback: 'index.html', precompress: false }),
		paths: { relative: true }
	}
};

export default config;
