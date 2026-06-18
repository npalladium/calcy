import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Calcy',
				short_name: 'Calcy',
				description: 'Unit-aware, uncertainty-aware notepad calculator',
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
