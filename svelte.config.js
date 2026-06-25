import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Long-form docs (the Guide, Reference, How it works) are authored as Markdown
	// under src/lib/docs and compiled by mdsvex. They use the `.md` extension so
	// GitHub renders them directly; mdsvex only compiles the ones the app imports,
	// so the repo's other Markdown (README, docs/) is left untouched.
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), mdsvex({ extensions: ['.md'] })],
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
