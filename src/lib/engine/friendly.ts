// Plain-language overlay for engine error messages.
//
// The engine throws precise, developer-facing messages (e.g. "incompatible
// dimensions: m + s"). Those stay verbatim in `LineResult.error`. This module
// maps the common ones to a friendlier sentence surfaced first in the UI, so a
// non-technical user gets "Can't add m and s—they measure different things."
// while the raw error remains one hover away. A message with no rule returns
// `undefined` (the UI just shows the raw error)—including ones that are
// already plain prose, like the "(lo to hi) unit" interval hint.

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// `topic`, when present, is the title of the cheat-sheet group (see
// $lib/cheatsheet) whose examples address this class of mistake — the UI turns
// it into a "see examples" link. Only set it for errors that signal a *concept*
// gap (wrong kind of quantity, undefined name) rather than a plain typo, where
// pointing at examples genuinely helps.
type Rule = [RegExp, (m: RegExpExecArray) => string, string?];

const UNITS = 'Units & conversion';

const RULES: Rule[] = [
  [
    /^incompatible dimensions: (.+) \+ (.+)$/,
    (m) => `Can't add ${m[1]} and ${m[2]}—they measure different things.`,
    UNITS
  ],
  [
    /^incompatible dimensions: (.+) - (.+)$/,
    (m) => `Can't subtract ${m[2]} from ${m[1]}—they measure different things.`,
    UNITS
  ],
  [
    /^cannot compare (.+) with (.+)$/,
    (m) => `Can't compare ${m[1]} and ${m[2]}—they're different kinds of quantity.`,
    UNITS
  ],
  [
    /^cannot convert (.+) to (.+)$/,
    (m) => `Can't convert ${m[1]} to ${m[2]}—they measure different things.`,
    UNITS
  ],
  [
    /^unknown identifier '(.+)'$/,
    (m) =>
      `I don't recognise "${m[1]}". Check the spelling, or define it as a variable or unit first.`,
    'Variables & comments'
  ],
  [/^unknown function '(.+)'$/, (m) => `There's no function called "${m[1]}".`],
  [/^sum: incompatible dimensions/, () => `sum needs every value to be in the same units.`, UNITS],
  [/^result is infinite$/, () => `That came out infinite—usually from dividing by zero.`],
  [
    /^result is not a real number$/,
    () => `That didn't produce a real number—check for things like the square root of a negative.`
  ],
  [
    /^(.+) must be dimensionless$/,
    (m) => `${cap(m[1])} must be a plain number, with no units.`,
    UNITS
  ],
  [
    /^(.+) must be a deterministic scalar$/,
    (m) => `${cap(m[1])} must be a single fixed number, not a range.`,
    'Uncertainty'
  ],
  [
    /trailing tokens after expression/,
    () => `I couldn't read the whole line—there's something extra after a complete expression.`
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

// The cheat-sheet group whose examples address this error, if any.
export function errorTopic(raw: string): string | undefined {
  for (const [re, , topic] of RULES) {
    if (topic && re.test(raw)) return topic;
  }
  return undefined;
}
