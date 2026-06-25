import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Long-form docs (the Guide, How it works) are authored as Markdown `.svx`
	// files under src/lib/docs and compiled by mdsvex, so the prose lives in
	// plain Markdown rather than hand-written HTML inside a component.
	extensions: ['.svelte', '.svx'],
	preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx'] })],
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
