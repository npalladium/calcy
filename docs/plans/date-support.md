# Plan: date support (levels 1–2)

Add **absolute calendar dates** as a first-class value, with the two operations
that fall out of the existing model:

1. **Date literals + subtraction** — `2026-12-25 - 2026-07-14` → a duration.
2. **Date ± duration → date** — `2026-07-14 + 90 days` → `2026-10-12`.

Explicitly **out of scope** (level 3–4, deferred — see "Non-goals"): calendar-
correct month/year arithmetic, business days, timezones, and a live `today()`.

## The one idea

calcy's value is "a distribution of a **dimensioned quantity**" — a magnitude on
a dimension. A calendar date is *not* a quantity; it's a **point** on the time
axis (an offset from an epoch). The engine already models exactly this shape for
temperature: `°C` is an **affine** unit, and values carry a `temp: 'abs' | 'diff'`
tag driving a point-vs-delta algebra (`tempAlgebra`, `eval.ts:207–251`).

**Canonical terms** (use these in code and docs):

- **instant** — an absolute point in time (a date). Dimension `{time: 1}`, tagged
  absolute. Stored as **seconds since the Unix epoch (1970-01-01T00:00:00Z)** in
  the canonical base unit (`s`), exactly like every other magnitude.
- **duration** — a time *span* (what exists today). Dimension `{time: 1}`, no
  absolute tag. Unchanged.

An instant is to a duration as `°C` is to `Cdeg`. We reuse that machinery rather
than inventing a parallel one.

## Value-model change (`value.ts`)

The existing `temp?: 'abs' | 'diff'` tag is temperature-specific. Generalize the
concept to a dimension-agnostic **affine-point tag** so temperature and time share
one algebra:

```ts
// value.ts — replace the temperature-only tag with a general point tag.
// `abs` = an absolute point (°C, an instant); `diff` = a delta (Cdeg, a duration).
// Only set on values whose dimension is a single pure affine axis
// (temperature-only or time-only). Plain K / plain seconds stay untagged.
point?: 'abs' | 'diff';
```

- Migration is mechanical: rename `temp` → `point` across `eval.ts` / `format.ts`
  / tests. Behaviour for temperature is identical (the tag values are the same).
- An instant is `{ dim: {time:1}, scalar: <epoch seconds>, point: 'abs' }`.
- Keep the invariant already documented on `temp`: the tag is only meaningful on
  a **pure single-axis** value. A composite dim (e.g. `time·length`) drops it.

### Other affine points — what the generalized tag must account for

Affine = an arbitrary zero, so *absolute − absolute = delta* and *absolute +
absolute* is nonsense. calcy already ships **two** affine axes:

- **Temperature** (`°C`/`°F`) — carries the `temp` tag and the full abs/diff
  **algebra** (`tempAlgebra`).
- **Gauge pressure** (`barg`/`psig`) — affine on **conversion only** (`+1 atm`
  offset applied on multiply / undone on display; `affine-units.test.ts:34–41`).
  It does **not** currently enforce abs/diff addition rules.

Design consequence: the `temp` → `point` rename **must be tag-set-preserving**.
Set `point:'abs'/'diff'` only for temperature and instants (as `temp` is set
today); **do not** start tagging pressure. That keeps gauge-pressure behaviour
byte-for-byte identical (`2 barg + 3 barg` stays lenient, as tested) while making
the *machinery* dimension-agnostic so pressure — or any future affine axis — can
opt into the point algebra later without another refactor.

**Deliberately not affine points (do not model with `point`):**

- **Decibels / pH** — logarithmic, not affine; already handled by the separate
  `log` tag/machinery.
- **Kelvin / Rankine** — true zero (ratio scale), so plain multiplicative units;
  untagged, unchanged.
- **Percentage vs percentage-points** — looks affine but is additive-on-a-ratio,
  a different problem; leave with the existing percent handling.
- **Elevation-above-datum, musical pitch (cents/MIDI)** — genuinely affine but
  too niche for a general calculator; skip unless a real use-case appears.
- **Time-of-day / datetime** — the natural in-family extension of instants (add a
  `datetime` literal + 00:00 handling), but it drags in timezones, so it rides
  with level 3, not level 1–2.

Net: for **this** work the point tag serves exactly two axes (temperature, time);
its only new job is time. Pressure is explicitly left alone.

## Evaluator (`eval.ts`)

Generalize `tempAlgebra` → **`affinePointAlgebra(op, a, b)`**, unchanged in logic
(it never actually reads temperature — it only branches on the tag and `dimEq`):

| op | a / b tags | result | meaning |
|----|-----------|--------|---------|
| `-` | abs, abs | diff | **date − date → duration** |
| `-` | abs, diff | abs | date − span → earlier date |
| `-` | diff, diff | diff | span − span |
| `-` | diff, abs | error | "cannot subtract a date from a duration" |
| `+` | abs, diff / diff, abs | abs | **date + span → date** |
| `+` | abs, abs | error | "cannot add two dates — subtract them for a span" |
| `+` | diff, diff | diff | span + span |
| `*`,`/` | abs, * | error | a point has no scale (reject; only a duration scales) |

`dimEq` guards mismatched dims (`2026-07-14 + 5 m`) into the ordinary
incompatible-dimensions error, exactly as today. Comparisons (`<`, `>`) already
compare base magnitudes, so `d1 < d2` works for instants with no change.

**Distributions compose for free.** An uncertain instant
(`2026-07-14 + (80 to 100) days`) is a sampled time-dim value with `point: 'abs'`;
`chance(ship < 2026-10-01)` then works through the existing Monte-Carlo path —
this is the payoff of not bolting on a separate date type.

## Parser (`parse.ts`) — the `-` ambiguity

An ISO date literal collides with subtraction: `2026-07-14` vs `2026 - 07 - 14`.
Resolve it in the **lexer** with a strict, whitespace-sensitive rule:

- A **date literal** is `\d{4}-\d{2}-\d{2}` with **no surrounding spaces** inside
  it. Emitted as a single `date` token → `{time:1}` epoch-seconds value, tagged
  `point:'abs'`, with a `unitHint` marking it for date display.
- `2026 - 07 - 14` (spaces) stays three number tokens and two subtractions.
- Reject impossible dates at parse time (`2026-13-40`) with a friendly error via
  the existing `friendly.ts` path.
- **Time-of-day is out of scope for L1–2**: date-only, interpreted at
  **00:00:00Z** (see Non-goals on timezones). Revisit if `datetime` is wanted.

No new keyword is introduced, so no clash with `in`/`to`/`per`/`given`.

## Display / formatting (`format.ts`)

- A value tagged `point:'abs'` on `{time:1}` renders as an **ISO date**
  (`2026-10-12`), not `1.79e9 s`. Add a branch in the summary/format path
  analogous to the affine-display branch (`UnitHint.offset`).
- `date in days` / `... in weeks` etc.: converting an **instant** to a plain time
  unit is ill-defined (epoch-relative) — treat `in <date-format>` as the only
  valid conversion of an instant, and let `in days`/`in weeks` apply to the
  **duration** from a subtraction (`(d2 - d1) in weeks`), which already works.
- A **duration** still formats exactly as today. No regression: plain `K` and
  plain `s` values remain untagged and untouched.

## Non-goals (explicit — this is where level 3–4 live)

- **Calendar-correct months/years.** `month = 30.436875 d`, `year = 365.25 d`
  are fixed averages (`index.ts:29–30`). So `2026-01-31 + 1 month` lands ~30.44 d
  later (early March), **not** 2026-02-28. This must be **documented loudly** in
  the Reference: *"adding `month`/`year` to a date uses average lengths; for
  exact calendar math use `days`."* True calendar arithmetic is level 3.
- **Timezones / DST.** Dates are civil dates at UTC midnight. No tz handling.
- **Live `today()`/`now()`.** Injecting wall-clock time breaks the engine's
  determinism contract (sheets recompute identically from source+seed;
  `index.ts:177`). *If* wanted later, the honest design is an **eval-time
  parameter** — add `now?: number` to `EngineOptions` (like `seed`), thread the
  sheet's saved "evaluated-at" timestamp through, and persist it so a shared or
  reloaded sheet reproduces. That is a separate, opt-in change; L1–2 ships with
  **explicit literals only** and stays fully deterministic with no schema change.

## Persistence / compatibility

No DB or backup schema change: sheets already store **source + seed** and
recompute. Date literals are just source text. Old sheets are unaffected. No
`EXPORT_VERSION` bump, no migration.

## Docs

- **Reference** (`reference.md`): new "Dates" section — literal syntax, the
  add/subtract algebra table, the average-month caveat, and the "no live today"
  note. Regenerate the catalogue if any unit rows change (`pnpm gen:reference`).
- **Guide** (`guide.md`): one short, plain-English example ("days until a
  deadline", "ship date + estimate"). No jargon.
- **Cheat sheet** (`cheatsheet.ts`): click-to-insert `2026-12-25 - 2026-07-14`
  and `2026-07-14 + 90 days` (both are doctested — `help-doctests.test.ts`).
- **Template**: extend the existing "Project estimate" starter with a
  `ship = 2026-07-14 + total` line so dates appear in first-run reach (templates
  are eval-tested — `templates.test.ts`).

## Test plan (TDD, red→green)

New `tests/dates.test.ts` plus additions to existing specs:

- **Parsing**: `2026-07-14` → instant; `2026 - 07 - 14` → arithmetic (regression
  guard for the whitespace rule); `2026-13-01` → friendly error.
- **Algebra (golden)**: each row of the table above, including the two error
  cases (`date + date`, `duration − date`).
- **Duration round-trip**: `(2026-12-25 - 2026-07-14) in days` → 164.
- **Uncertainty**: `chance(2026-07-14 + (80 to 100) day < 2026-10-20)` in a
  sensible band; verifies instants flow through Monte-Carlo.
- **Property (`fast-check`)**: `d + span - span == d`; `(d2 - d1) == -(d1 - d2)`;
  instant comparison total-orders with the underlying epoch seconds.
- **Display**: instant formats as ISO; duration formatting unchanged (snapshot).
- **Regression**: full temperature suite (`affine-*.test.ts`) stays green after
  the `temp` → `point` rename — this is the risk gate for the refactor.
- Mutation testing already covers `eval.ts`; the generalized algebra inherits it.

## Rollout — atomic commits (each green on its own)

1. **Refactor `temp` tag → general `point` tag** (behaviour-preserving; all
   temperature tests stay green). Pure rename + generalize `tempAlgebra` →
   `affinePointAlgebra`. No new feature.
2. **Parse ISO date literals** → epoch-seconds instants (parser + friendly errors
   + parse tests). No arithmetic yet.
3. **Instant arithmetic** — wire instants into `affinePointAlgebra` and add the
   date-display branch in `format.ts`; golden + property + display tests.
4. **Docs + cheat sheet + template** update.

## Success criteria

- `2026-12-25 - 2026-07-14 in days` → `164 days`; `2026-07-14 + 90 days` →
  `2026-10-12`; `date + date` and `duration - date` give friendly errors.
- Uncertain-instant `chance(...)` works through Monte-Carlo.
- All existing gates green (`lint`, `lint:svelte`, `check`, `knip`, `test`),
  temperature suite unchanged, no schema/version bump.
- Reference documents the average-month caveat and the deliberate absence of a
  live `today()`.
