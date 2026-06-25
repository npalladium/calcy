import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BEGIN_MARKER, END_MARKER, renderCatalogue } from '../scripts/reference-catalogue';
import { FUNCTIONS } from '../src/lib/engine/eval';

// Guards the auto-generated Reference catalogue (see scripts/reference-catalogue.ts):
//   1. Freshness — the committed region in reference.md matches a fresh render,
//      so a commit can't ship a stale catalogue (run `pnpm gen:reference`).
//   2. Completeness — every user-callable function in the `evalCall` switch is
//      listed in FUNCTIONS, and vice versa, so adding a function without
//      documenting it (or deleting one) fails here.

const reference = readFileSync(new URL('../src/lib/docs/reference.md', import.meta.url), 'utf8');

describe('Reference catalogue is generated and current', () => {
	it('reference.md has the catalogue markers', () => {
		expect(reference).toContain(BEGIN_MARKER);
		expect(reference).toContain(END_MARKER);
	});

	it('the committed catalogue matches a fresh render', () => {
		const start = reference.indexOf(BEGIN_MARKER);
		const end = reference.indexOf(END_MARKER);
		const committed = reference.slice(start, end + END_MARKER.length);
		expect(committed, 'reference.md catalogue is stale — run `pnpm gen:reference`').toBe(
			renderCatalogue()
		);
	});
});

describe('FUNCTIONS catalogue covers exactly the user-callable functions', () => {
	const evalSrc = readFileSync(new URL('../src/lib/engine/eval.ts', import.meta.url), 'utf8');

	// Internal AST-node cases and operators handled by the same switch — these are
	// not user-facing functions and so are intentionally absent from FUNCTIONS.
	const INTERNAL = new Set([
		'num',
		'ident',
		'call',
		'neg',
		'list',
		'range',
		'where',
		'given',
		'convert',
		'bin',
		'+',
		'-',
		'*',
		'/',
		'<',
		'>',
		'<=',
		'>='
	]);

	// Every `case '...'` label in the file (the dispatch is one switch).
	const caseLabels = new Set(
		[...evalSrc.matchAll(/case '([^']+)':/g)].map((m) => m[1]).filter((n) => !INTERNAL.has(n))
	);
	// `bracket` is dispatched before the switch (it reads weight:value pairs), so
	// add it explicitly.
	caseLabels.add('bracket');

	const documented = new Set(FUNCTIONS.flatMap((f) => [f.name, ...(f.aliases ?? [])]));

	it('no engine function is undocumented', () => {
		const missing = [...caseLabels].filter((n) => !documented.has(n));
		expect(missing, `add to FUNCTIONS in eval.ts: ${missing.join(', ')}`).toEqual([]);
	});

	it('no documented function is missing from the engine', () => {
		const extra = [...documented].filter((n) => !caseLabels.has(n));
		expect(extra, `not dispatched in evalCall: ${extra.join(', ')}`).toEqual([]);
	});
});
