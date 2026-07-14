# Plan: add Svelte-aware static analysis

Biome deliberately excludes `.svelte` (its Svelte support is partial). This adds
three complementary layers so component code and dead code can't drift, and
wires them into the `pre-push` gate.

## Scope (chosen)

1. **svelte-check `--fail-on-warnings`** — make compiler warnings (a11y,
   unused CSS, etc.) fail instead of print. Zero new deps.
2. **knip** — dead code / unused deps / unused exports across the project.
3. **eslint + eslint-plugin-svelte**, scoped to `**/*.svelte` only — the real
   Svelte linter; Biome keeps owning `.ts`/`.js`.

Rejected: madge (circular deps) — not selected.

## Steps

### 1. svelte-check `--fail-on-warnings`
- `check` script → `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --fail-on-warnings`.
- Tree is currently warning-clean, so this must still pass unchanged.

### 2. knip
- `pnpm add -D knip`; add `"knip": "knip"` script and `knip.json`.
- Config, tuned so the current tree passes **without deleting intended surface**:
  - `ignoreExportsUsedInFile: true` — clears symbols exported but only used in
    their own file (`normalOp`, `lognormalOp`, `ksStatistic`, `ksCritical`,
    `FAST`, likely `DEFAULT_OPTIONS`/`RATE_PERIODS`, og-card `SCENARIO_*`).
  - `ignoreDependencies` (with a comment): `workbox-window` (pulled via
    `virtual:pwa-register`), `@chromatic-com/storybook`, `@storybook/addon-vitest`
    (Storybook tooling knip can't trace). **Do not uninstall these** — removing
    `workbox-window` risks the PWA service worker.
- Genuinely-dead findings: **delete only after a grep confirms zero references.**
  - `wordBefore` in `src/lib/editor.ts` — confirmed no callers → remove.
  - Redundant barrel re-exports / unused types (`Summary`, `Node` re-exports from
    `engine/index.ts`, `CheatItem`, `SheetBackup`) — drop the re-export/`export`
    only where a grep shows nothing imports them; underlying definitions stay.
  - Re-run live knip for `buildUnitCatalogue` (grep finds no such symbol now).

### 3. eslint-plugin-svelte (scoped)
- `pnpm add -D eslint eslint-plugin-svelte svelte-eslint-parser typescript-eslint globals`.
- Flat `eslint.config.js`: `files: ['**/*.svelte']` only; `svelte-eslint-parser`
  with `parserOptions.parser` = typescript-eslint for `<script lang="ts">`;
  ignore `.svelte-kit`, `build`, `dist`, `node_modules`, `static`.
- Add `"lint:svelte": "eslint ."`; fix any findings (or justify inline disables).

### 4. Gate + docs
- `pre-push` → `pnpm lint && pnpm lint:svelte && pnpm check && pnpm knip && pnpm test`.
- Note the split (Biome=.ts, ESLint=.svelte, knip=dead code) in README quality gates.

## Success criteria
- `pnpm check`, `pnpm lint`, `pnpm lint:svelte`, `pnpm knip`, `pnpm test` all green.
- No production code/data deleted beyond grep-confirmed dead exports.
- Each step is its own atomic commit that passes on its own.
