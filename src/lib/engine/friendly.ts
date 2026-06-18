// Plain-language overlay for engine error messages.
//
// The engine throws precise, developer-facing messages (e.g. "incompatible
// dimensions: m + s"). Those stay verbatim in `LineResult.error`. This module
// maps the common ones to a friendlier sentence surfaced first in the UI, so a
// non-technical user gets "Can't add m and s — they measure different things."
// while the raw error remains one hover away. A message with no rule returns
// `undefined` (the UI just shows the raw error) — including ones that are
// already plain prose, like the "(lo to hi) unit" interval hint.

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const RULES: [RegExp, (m: RegExpExecArray) => string][] = [
	[
		/^incompatible dimensions: (.+) \+ (.+)$/,
		(m) => `Can't add ${m[1]} and ${m[2]} — they measure different things.`
	],
	[
		/^incompatible dimensions: (.+) - (.+)$/,
		(m) => `Can't subtract ${m[2]} from ${m[1]} — they measure different things.`
	],
	[
		/^cannot compare (.+) with (.+)$/,
		(m) => `Can't compare ${m[1]} and ${m[2]} — they're different kinds of quantity.`
	],
	[
		/^cannot convert (.+) to (.+)$/,
		(m) => `Can't convert ${m[1]} to ${m[2]} — they measure different things.`
	],
	[
		/^unknown identifier '(.+)'$/,
		(m) =>
			`I don't recognise "${m[1]}". Check the spelling, or define it as a variable or unit first.`
	],
	[/^unknown function '(.+)'$/, (m) => `There's no function called "${m[1]}".`],
	[/^sum: incompatible dimensions/, () => `sum needs every value to be in the same units.`],
	[/^(.+) must be dimensionless$/, (m) => `${cap(m[1])} must be a plain number, with no units.`],
	[
		/^(.+) must be a deterministic scalar$/,
		(m) => `${cap(m[1])} must be a single fixed number, not a range.`
	],
	[
		/trailing tokens after expression/,
		() => `I couldn't read the whole line — there's something extra after a complete expression.`
	],
	[/^unexpected character '(.+)'$/, (m) => `Unexpected character "${m[1]}".`],
	[/^unexpected end of expression$/, () => `The expression looks unfinished.`]
];

export function errorHint(raw: string): string | undefined {
	for (const [re, fn] of RULES) {
		const m = re.exec(raw);
		if (m) return fn(m);
	}
	return undefined;
}
