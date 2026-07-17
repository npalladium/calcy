// Renders the auto-generated "Catalogue" section of the Reference doc from the
// engine's own tables: UNIT_CATALOGUE (units.ts), FUNCTIONS (eval.ts), and
// KEYWORDS/DIRECTIVES (parse.ts). This is the single source the doc lists, so it
// can never drift from what the engine actually knows.
//
// `renderCatalogue()` returns the markdown body, injected between sentinel
// markers in reference.md by scripts/gen-reference.ts (`pnpm gen:reference`, also
// run in `prebuild`). tests/reference-catalogue.test.ts asserts the committed
// region matches a fresh render, so a stale catalogue fails CI.
// The output uses tables and inline code only — never fenced ``` blocks — so the
// doc-examples test never tries to evaluate it.
import { type FnDoc, FUNCTIONS } from '../src/lib/engine/eval';
import { DIRECTIVES, KEYWORDS } from '../src/lib/engine/parse';
import { UNIT_CATALOGUE, type UnitCatEntry } from '../src/lib/engine/units';

export const BEGIN_MARKER = '<!-- BEGIN GENERATED CATALOGUE -->';
export const END_MARKER = '<!-- END GENERATED CATALOGUE -->';

// One-line descriptions for every reserved keyword and directive. Keyed by the
// token; renderCatalogue throws if a token in KEYWORDS/DIRECTIVES is missing
// here, so adding a keyword without documenting it fails the build.
const KEYWORD_DOCS: Record<string, string> = {
	in: 'convert units, and pin the output unit',
	to: 'build a confidence-interval range (`lo to hi`)',
	per: 'rate connector — `12 req per second` (same as `/`)',
	and: 'join spelled-out numbers, and `between A and B`',
	between: '`between A and B` — a natural 90% range',
	about: 'rough estimate, ±10% (also `~`)',
	of: '`X of Y` multiplies; `f of x` calls a one-arg function',
	step: 'stepped range — `1..10 step 2`',
	seen: 'Bayesian update — `prior seen k of n`',
	given: 'condition a distribution — `d given pred`; `beta given k of n`',
	every: 'reserved for a future per-window operator (not yet bound)',
	where: 'one-off locals for a line — `expr where a = 1, b = 2`',
	via: 'pick a named bridge for a conversion — `in INR via fx`',
	over: 'collapse a scenario axis in a reducer — `min(total over case)`'
};

const DIRECTIVE_DOCS: Record<string, string> = {
	unit: 'define your own unit — `unit sprint = 2 week`',
	currency: 'mint a currency dimension — `currency BTC, bitcoin`',
	bridge: 'name an exchange rate — `bridge fx = 83 ₹/$`'
};

const FN_CATEGORY_ORDER: FnDoc['category'][] = [
	'Distributions',
	'Reducers',
	'Scenarios',
	'Math',
	'Trigonometry',
	'Inference',
	'Tiered'
];

function unitToken(e: UnitCatEntry): string {
	const star = e.prefixed ? '\\*' : '';
	const aliases = e.aliases.length ? ` (${e.aliases.join(', ')})` : '';
	return `\`${e.canonical}\`${star}${aliases}`;
}

function renderUnits(): string {
	// Group by category, preserving first-seen order. 'Constants' is rendered
	// separately as named constants, not units.
	const order: string[] = [];
	const groups = new Map<string, UnitCatEntry[]>();
	for (const e of UNIT_CATALOGUE) {
		if (e.category === 'Constants') continue;
		if (!groups.has(e.category)) {
			groups.set(e.category, []);
			order.push(e.category);
		}
		groups.get(e.category)?.push(e);
	}
	const lines = order.map(
		(cat) => `- **${cat}** — ${(groups.get(cat) as UnitCatEntry[]).map(unitToken).join(' · ')}`
	);
	return [
		'### Units',
		'',
		'Every unit calcy ships with, grouped by quantity. A `\\*` marks a metric unit that also accepts the full set of SI prefixes (`k`, `M`, `G`, `m`, `µ`, …). Names in parentheses are accepted synonyms.',
		'',
		...lines
	].join('\n');
}

function renderConstants(): string {
	const consts = UNIT_CATALOGUE.filter((e) => e.category === 'Constants');
	return ['### Named constants', '', consts.map(unitToken).join(' · ')].join('\n');
}

function renderKeywords(): string {
	const kw = [...KEYWORDS].map((k) => {
		const doc = KEYWORD_DOCS[k];
		if (!doc)
			throw new Error(`reference-catalogue: keyword '${k}' has no description in KEYWORD_DOCS`);
		return `| \`${k}\` | ${doc} |`;
	});
	const dir = DIRECTIVES.map((d) => {
		const doc = DIRECTIVE_DOCS[d];
		if (!doc)
			throw new Error(`reference-catalogue: directive '${d}' has no description in DIRECTIVE_DOCS`);
		return `| \`${d}\` | ${doc} |`;
	});
	return [
		'### Keywords & directives',
		'',
		'Reserved words — don’t use them as variable names.',
		'',
		'| Keyword | Meaning |',
		'|---|---|',
		...kw,
		...dir
	].join('\n');
}

function renderFunctions(): string {
	const out: string[] = ['### Functions', ''];
	for (const cat of FN_CATEGORY_ORDER) {
		const fns = FUNCTIONS.filter((f) => f.category === cat);
		if (!fns.length) continue;
		out.push(`**${cat}**`, '', '| Call | What it does |', '|---|---|');
		for (const f of fns) {
			const alias = f.aliases?.length
				? ` _(alias: ${f.aliases.map((a) => `\`${a}\``).join(', ')})_`
				: '';
			out.push(`| \`${f.sig}\`${alias} | ${f.summary} |`);
		}
		out.push('');
	}
	return out.join('\n').trimEnd();
}

export function renderCatalogue(): string {
	return [
		BEGIN_MARKER,
		'',
		'<!-- Auto-generated from units.ts / eval.ts / parse.ts. Do not edit by hand —',
		'     run `pnpm gen:reference`. Guarded by tests/reference-catalogue.test.ts. -->',
		'',
		'## Catalogue',
		'',
		'A complete index, generated from the engine’s own tables, so it always matches what calcy actually accepts.',
		'',
		renderUnits(),
		'',
		renderConstants(),
		'',
		renderKeywords(),
		'',
		renderFunctions(),
		'',
		END_MARKER
	].join('\n');
}
