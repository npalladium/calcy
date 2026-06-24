# calcy — agent notes

A SvelteKit + Vite single-page app (uncertainty-aware unit calculator). Pure
client-side SPA (`ssr = false`, prerendered shell), built to static files with
`@sveltejs/adapter-static`.

## Build & test

```sh
pnpm dev          # local dev server
pnpm build        # static build → build/
pnpm test         # vitest (unit / property / golden)
pnpm lint         # biome
pnpm check        # svelte-check (types)
```

Run the full suite and lint/check before committing; only commit when green.

## Publishing (manual — no GitHub Actions)

We can't use GitHub Actions (account billing), so the site is published with a
local script that deploys to the `gh-pages` branch:

```sh
pnpm run publish:site      # = bash scripts/publish.sh
```

How it works (mirrors ~/npalladium/blog's deploy):

- Builds from a **detached worktree of HEAD**, so only committed files reach the
  published site — untracked/WIP files (e.g. `docs/proposals/`) never leak.
- Copies `build/` into a `gh-pages` worktree, adds `.nojekyll` (so GitHub Pages
  serves the `_app/` directory), commits, and pushes `origin gh-pages`.
- Creates the orphan `gh-pages` branch automatically on first run.

GitHub Pages is configured to serve the **`gh-pages` branch, root**. The app uses
relative asset paths (`paths: { relative: true }`) and a `404.html` SPA fallback,
so it works at the project subpath (`/calcy/`) with no base-path config — and
local dev still works at `/`.

After a push to `main`, run `pnpm run publish:site` to update the live site.

## Conventions

- Author identity for this project: **npalladium** / **Nikhil Reddy**.
- Use Unicode em dashes (`—`), no surrounding spaces; no trailing whitespace.
- TDD with small, individually-tested, atomic commits (see git history style).
