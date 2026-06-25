// mdsvex compiles `.svx` Markdown docs into Svelte components. This file has no
// top-level import/export so it stays a global ambient declaration (a module
// `app.d.ts`-style file would scope the wildcard and TS wouldn't apply it).
declare module '*.svx' {
	const component: import('svelte').Component;
	export default component;
}
