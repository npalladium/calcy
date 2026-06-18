# Natural-language-like syntax — gaps in calcy

User-facing gaps where the spoken/intended phrasing doesn't match what the engine
accepts. Scoped across both the pre-existing surface and the items added in this
branch (configurable CI, `update(...)`, tail-awareness).

## For items added in this branch

### `update(prior, k, n)` — Bayesian update

- **No past-tense verb.** `update(prior, k, n)` is programmer-shaped; a
  non-technical estimate reads as `beta(2, 8) seen 3 of 10` or
  `beta(2, 8) given 3 hits in 10 tries`. The postfix form `EXPR seen K of N`
  (and `given` as a synonym) is added in this branch.
- **No scalar/likelihood observation path.** A user observing a single value
  — "we measured 12 days, not 7" — has no `observe(prior, value)` shortcut.
  Only the full Beta–Binomial conjugate is implemented; a generic
  `likelihood(prior, observed, expected)` for one data point is missing.
- **Named args matter.** `update(prior, k=3, n=10)` is friendlier than positional,
  and is now supported via the `update` named-arg binder.
- **Counts expressed in prose.** `update(prior, "3 out of 10")` doesn't parse;
  user has to know the `(k, n)` shape. A `3 of 10` literal pair would feel
  native.

### Configurable confidence interval

- **`ci(2, 10, level=0.95)` works** — added in this branch as a function.
- **`2 to 10 (95% sure)` / `2 to 10, 95% confident` doesn't parse.** A trailing
  parenthetical or comma-phrase that maps to `ci(lo, hi, level)` would feel
  native to the existing `5 km + 3 mi` style. Not implemented yet.
- **`3 ± 1 day at 99%`** — the ± form has no level at the call site. Today
  the level only comes from the per-sheet setting.
- **`roughly` / `loosely` / `tightly`** as CI-width modifiers on a range. Today
  only `about`/`~` exists, and that's hardcoded to ±10%. The CI half-width is
  the missing dimension.

### Tail-awareness

- **No syntax gap.** This is a pure display feature. The grammar already
  produces `summary.skew`; the UI flags `LineResult.skewed`. Nothing to add
  at the grammar layer.

## Pre-existing features

### Numbers

- **Spelled-out operators.** `five thousand plus three hundred` should be
  `5000 + 300`. Today only the numbers are spelled; `+`/`-` still require
  symbols.
- **Spelled-out powers.** `ten squared`, `two cubed`, `two to the tenth` —
  none parse. The catalogue reads `^2` everywhere.
- **`times` / `divided by` as operators.** Only `*` / `/` work.
- **`a` / `an` indefinite article.** "a week", "an hour" — would need
  disambiguation against `unit a = …` definitions.

### Units

- **Plurals already work** (`meters`, `hours`). ✅
- **Compound-unit prose.** "ten kilometers per hour" — only "km/h" /
  "km per hour" work. "kilometers per hour" without "per" fails because
  juxtaposition binds tighter than expected.
- **Currency in prose.** `$5` works, `5 dollars` works, but
  `five dollars and fifty cents` doesn't.
- **`a quarter` / `half` as fractions.** Quarter is a unit, half is not —
  asymmetric.

### Confidence intervals & uncertainty

- **`roughly` / `tightly` / `loosely` as modifiers.** Same item as above —
  extends `about`/`~`.
- **`give or take` as prose for ±.** Only `±` and `+-` are recognized.
- **`somewhere between` / `somewhere around`.** Today only `between` and
  `about` are reserved.
- **One-sided CIs.** "probably less than X" / "at most X" — expressible only
  as `uniform(0, x)` or `normal(mu, sd)` truncated. No `less than 100` /
  `at most 100` syntax.

### Comparisons & chance

- **`odds of`, `probability of`, `chance of`.** Today only `chance(...)`
  works. No prose form for `chance(total < 25 day)`.
- **`more likely than not`** — `chance(x > 0.5)` is the only way.
- **`with 90% confidence, X is below Y`** — has no dedicated form.

### Variables & assignments

- **`let X be …` / `let X equal …`.** Only `=` works.
- **`where` for inline constraints.** `defects where batch_size > 100`.
- **`given that` for evidence.** `seen/given` covers the Bayesian case; could
  also apply to sensitivity: `chance(X > Y given Z > 0)`.

### Reducers & reducers-on-lists

- **`average of`, `total of`, `smallest of`, `largest of`.** `mean of` works
  via the `f of x` sugar; `sum of`, `min of`, `max of` don't because they
  take a *list*, not a scalar — though they now work in practice because
  `[1, 2, 3]` parses at primary level and `sum of [1, 2, 3]` chains correctly.
- **`average over the past 6 months`** — `mean([...])` works but the prose
  reads better with `mean of [...]`.
- **`how many X` / `count of X`.** No `count()` function at all; only
  `sum(1..n)`.

### Rates & accumulation

- **`X every Y` as rate shorthand.** Added in this branch: `1 req every 200 ms`
  desugars to `1 req / 200 ms`. Closes the most-asked spoken-form gap.
- **`over a period of N`** for accumulation. Today it's `rate * 30 year`,
  with no prose form.

### Distributions

- **Named distributions as adjectives.** "Normally distributed around 100
  with sd 15" — no prose path.
- **`equally likely to be …`** — `discrete(equal weights: ...)`; no prose.
- **`with probability P, X; otherwise Y`** — needs `discrete(P: X, (1-P): Y)`;
  the "otherwise" form isn't reserved.

### Estimation & project rollups

- **`the total of design and backend`** — `sum(a, b)` works but the prose
  reads better with `sum of a, b` (no grammar change needed if `of` extends
  to multi-arg).
- **`odds we hit the deadline`** — must be `chance(total < deadline)`.

### Custom units

- **`define X as …` / `let X be …`.** Only `unit X = …` works.
- **`X is N units of Y`** — no prose form.

### Bracket math

- **Progressive tax in prose.** "the first $11,600 taxed at 10%, the next
  $35,550 taxed at 12%, the rest at 22%" — works only as `bracket(...)`;
  no `up to` / `then` keywords.

### Bayesian (new in this branch)

- **`based on K successes in N trials`** — `seen K of N` added.
- **`given evidence …`, `assuming …`, `after observing …`** — still missing.
- **`weakly informed` / `strongly informed` priors** — vocabulary for the
  *strength* of a `beta(α, β)` prior (low α+β = diffuse, high = concentrated).
  Today the user picks α and β numerically with no verbal handle.

### Cross-cutting

- **Sentence-initial capitalisation.** Tokenizer is case-insensitive, but
  documentation and examples never use caps. A user typing
  `# The design takes 3 to 5 days` then `desIGN = above` works; nobody tells
  them so.
- **Trailing `s` on spelled-out numbers in conjunction.** `two hundreds` vs
  `two hundred` — current `combineWords` accepts only the singular form.
- **Implicit `it` / `that` reference to the previous line.** "double it" /
  "half of that" — no anchor to `above`.
- **`equal` / `equals` / `is` prose for `=`.** Only `=` parses.
- **`and` between two values** — currently `between A and B` works, but bare
  `A and B` doesn't imply an interval. Could it? Today it errors as an
  unexpected identifier.

## Priority ranking

The five highest-value gaps (most common in actual estimation prose, smallest
grammar surface):

1. **`sum of`, `min of`, `max of` as list reducers** — reuses the existing
   `f of x` sugar. Already works in practice for list literals via
   juxtaposition. ✅ (no change required)
2. **`roughly X` / `tightly X` / `loosely X`** as CI-width modifiers —
   additive to `about`, gives users a knob they currently hack around with
   `(0.5 to 1.5) * x`.
3. **`X every Y` as rate shorthand** — added in this branch.
4. **`let X be …` / `let X equal …`** — extends the assignment grammar.
5. **`with probability P`** inside `discrete` — extends `discrete()` so users
   don't need the `P:` colon syntax.

The other gaps (#1 numbered gaps and cross-cutting) need user research to
confirm they're worth the grammar surface before adding keywords.