# Plan: the scenario table block (the remaining multi-line work)

Two features — **scenarios** (labelled multi-value) and **correlate** (coupling
distributions) — needed one shared capability the engine originally lacked: a
**multi-line, indentation-delimited block**. That block layer now ships, and the
`correlate:` block is built on it. The **one remaining piece** is the `scenario
<axis>:` table (Surface 1 below). This doc keeps the design rationale the block
layer and the table rely on; the shipped pieces are summarised here, with their
full behaviour living in the code and tests.

Design principle throughout: **explicit over implicit** — no behaviour is
triggered by argument position, argument type, or statement order, only by an
explicit name or block.

## What already ships

Single-line (no block):

- **scenarios** — the inline `scenario[axis](low: …, base: …, high: …)`
  constructor, axis arithmetic (align/broadcast/cross), `pick(x, axis =
  "coord")`, and reducers' `over <axis>`. Tests: `tests/scenario.test.ts`.
- **correlate** — `correlate(reference, marginal, r)`: couple a freshly-drawn
  marginal to an already-drawn, sample-based reference at rank correlation `r`,
  preserving the marginal exactly. Tests: `tests/correlate.test.ts`.

Multi-line (the block layer + its first surface):

- **the block layer** — a grouping pre-pass in `Engine.evalSheet` folds a header
  plus its indented body into one unit; every physical line still yields one
  `LineResult`. `indentOf` / `blockHeaderKind` are factored so the scenario
  table can reuse the grouping.
- **the `correlate:` block** — Surface 2 below, shipped. Tests:
  `tests/correlate-block.test.ts`, with the symmetric N-variable reorder in
  `correlateJoint` (`mc.ts`, `tests/correlate.test.ts`).
- **correlation-aware closed form** — `normal ± normal` and `lognormal × / ÷`
  now fold the operands' empirical correlation into the propagated spread (with
  a noise floor so independent operands keep their exact analytic value), so a
  coupled sum/product shows the true variance instead of the independence one.
  Tests: `tests/closed-form.test.ts`.

The scenario table below desugars onto the shipped inline constructor — it adds
a *multi-line grouping surface*, not new value semantics.

## The block layer (shipped)

### Delimiter — indentation

A block is a **header line** ending in `:` followed by a **body** of lines
indented deeper than the header. The first line indented at or below the
header's column (or EOF) ends the block. Blank and comment lines inside the body
are allowed and don't close it. Indentation is spaces (the tree is
space-indented); one level = "more indented than the header" — no fixed width,
only strictly-greater indentation, which keeps it forgiving. (`{}`/`end`
delimiters were considered and rejected; indentation is locked.)

### Where grouping happens

A **driver-level** pre-pass in `evalSheet`, between `split('\n')` and the
per-line map, folds a header + its body into one block unit. `evalSheet` scans
for a header (`blockHeaderKind`), consumes the body lines indented deeper than
it, and hands the group to a block evaluator; each physical line still yields a
`LineResult`, so gutter and line numbering are unchanged, and `parseLine` stays
single-line. (A `block` Line variant was the alternative, but the driver must
assemble the body first anyway, so it only moved the same work.)

### LineResult / rendering

- The **header** line renders as a label (a `unitdef`-kind result).
- **Body** lines each render their own result where meaningful (a `correlate:`
  member is an ordinary variable line; a scenario-table row will be a
  scenario-valued line).
- A malformed block reports the error **on the offending body line**, not the
  header, so the message points at the fix. A whole-block failure with no single
  offending line (a non-positive-definite `correlate:` matrix) reports on the
  header.

## Canonical terms (scenarios)

Used in code and docs:

- **axis** — a named, ordered set of **coordinates**, e.g. axis `case` with
  coords `low, base, high`.
- **coordinate** (**coord**) — one labelled point on an axis (`low`).
- **cell** — one combination of coords across all of a value's axes (`case=low,
  geo=us`). Each cell holds a full scalar/distribution.
- **sample axis** — the existing Monte-Carlo dimension (N draws). Special: it is
  **shared/broadcast, never crossed**.

### Alignment rules (shipped; the table relies on them)

When a binary op combines `L` and `R`, axis sets resolve by name:

1. **Same axis name in both** → **align** (zip). Coords must match exactly
   (labels + order); result keeps that one axis. Mismatch is a hard error.
2. **Axis name in one only** → **broadcast**: add the axis; repeat the other
   operand across its coords.
3. **Different axis names** → **cross** (Cartesian). Result carries both axes.
4. **No axes** → the scalar/sample path, unchanged.

Cross-vs-align is decided by the axis *name* the author typed, so it's explicit.
A **cell-count cap** (256) guards a runaway cross with an error naming the axes.

## Surface 1 — the `scenario <axis>:` table

The common real case is "one axis, many variables moving together". Columns are
coords, rows are variables, every cell an expression, all bound to one axis:

```
scenario case:
  #          low    base   high
  traffic  = 10k    50k    100k   req
  price    = 8      10     14     $
  cost     = 9      6      4      $

margin = (price - cost) * traffic     # all share axis `case` → 3 aligned outcomes
```

- Header `scenario <axis>:` names the axis; the optional `# …` row names the
  coords (columns), unquoted (header position).
- Each body row `name = e1 e2 e3 [unit]` **desugars to the shipped inline
  constructor**: `name = scenario[axis](low: e1, base: e2, high: e3) [unit]`.
  The table is a column-aligned way to write many one-row constructors sharing
  an axis; same-table rows zip (never cross).

New work is **parsing** only: read the coord header, split each row into column
expressions, validate every row has one cell per coord. No new value model.

### Sampling — common random numbers

When a scenario axis coexists with the sample axis, every cell should draw from
the **same underlying random stream**, so a difference between `case=low` and
`case=high` reflects the assumption, not sampling noise. This only bites once
distribution cells must be compared across coords; v1's inline path doesn't
exercise it. Caveat for when it does: sharing a stream aligns draws exactly only
for inverse-CDF samplers (normal, lognormal, uniform, exponential, weibull); the
beta/PERT samplers use Marsaglia–Tsang rejection (`mc.ts`), which consumes a
variable number of uniforms per draw and desynchronises a naive shared stream.
Fix: give each draw index its own substream (a counter-based RNG keyed by
`(seed, draw_index)`). Decide before building — it constrains the RNG choice.

### Rendering (the gutter)

- **1 axis** → labelled table (coord → value), each value formatted as a scalar
  line is today.
- **2 axes** → labelled grid (rows × cols); heatmap when numeric and dense.
- **≥3 axes or > cap** → collapse to a summary with drill-down + an explicit
  "N cells, showing summary" note.

Today the engine emits a one-line `case: low=…, base=…` fallback; richer
≥2-axis rendering is part of this work.

## Surface 2 — the `correlate:` block (shipped)

Binds two or more independent distributions with a target correlation while
preserving each marginal exactly. The block **defines** its members, so a
correlated variable never exists in an uncorrelated form a later line could pick
up — the invariant that motivates a block over a mutating `bind()`.

```
correlate:
  traffic    = pert(10k, 50k, 100k) req
  conversion = normal(0.02, 0.005)
  spend      = 100 to 300 $

  cor(traffic, conversion) = 0.5
  cor(traffic, spend)      = -0.3
  # conversion ↔ spend unspecified → 0
```

Pairwise `cor(a, b) = r` beats a literal matrix: explicit about which pairs are
coupled, unspecified pairs default to 0, no way to typo a wrong-sized matrix.

### The one idea

The engine already has **correlation-by-reuse**: shared sample arrays stay
correlated. The missing piece was *imposing* a target correlation on
independently-drawn arrays — **Iman–Conover rank reordering**: draw each marginal
independently, then reorder jointly so their rank correlation matches the target
matrix. Reordering never touches the values, so every marginal is preserved
exactly; only the pairing changes. The single-line `correlate(...)` is the
two-variable, one-reference-fixed case; the block is the symmetric, N-variable
generalisation in `correlateJoint` (score matrix → whiten by inverse Cholesky of
its own correlation → recolour by the target Cholesky → copy each column's rank
order onto the sorted marginal).

### Rules — all explicit, all fail loud (implemented)

- **Members must be sample-based** — a deterministic scalar has no draws to
  reorder → error naming the offender.
- **Members must be defined inside the block** — a member evaluates against a
  units-only env, so referencing another member or an outside variable is
  rejected (preserves the no-uncorrelated-leak invariant).
- **`|r| < 1` strictly**, and the assembled matrix must be **positive definite**
  (Cholesky is the check). `r = ±1` is a hard error suggesting a formula
  (`b = -a`) instead; a non-PD joint errors on the header — no silent
  nearest-PSD projection.
- **Marginals preserved exactly**; only cross-array pairing changes.
- **`r` is rank (Spearman) correlation** — what Iman–Conover induces and what the
  sensitivity view measures. No exact-Pearson promise after nonlinear marginals.

### Scoping

Members **leak to the sheet** (else they'd be useless downstream). The block is a
grouping-and-coupling construct, not a new lexical scope — members are ordinary
top-level variables whose sample arrays happen to be jointly reordered. A
downstream `a + b` / `a * b` then reflects the coupling: the correlation-aware
closed form (above) reads the imposed correlation into the combined spread.

## Build order

1. **Block layer** — driver grouping + the indentation rule + the LineResult
   model. ✅ shipped.
2. **`correlate:` block** — body grammar (definitions + `cor` pairs); the
   Iman–Conover core plus matrix assembly + Cholesky. ✅ shipped.
3. **`scenario <axis>:` table** — column-aligned row parsing; desugars to the
   shipped inline constructor. Plus the ≥2-axis grid rendering above. ← remaining.

## Open questions (for the scenario table)

1. How a multi-cell scenario-table row reports a per-column parse error.
2. Whether a scenario-table row may hold distribution cells that must share
   common random numbers across coords (see Sampling above) — deferred until the
   table exercises it.
3. Coord-label formatting inside a grid cell (distribution summaries).

Settled while building the block layer: indentation is lenient
(strictly-greater than the header); a non-PD `correlate:` matrix errors on the
header rather than projecting.

## Non-goals (first build)

- Nested blocks.
- Cross-block references beyond members leaking to the sheet.
- Positional/anonymous coords; positional `where`-list expansion.
- Exact-Pearson guarantees; correlating deterministic or across-sheet values.
- `{}`/`end` delimiters (indentation is locked).
