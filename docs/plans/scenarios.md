# Plan: scenarios (named-axis multi-value)

Let a single line carry **several labelled outcomes at once** — "Low / Base /
High", "basic vs pro", "us vs eu" — composing across the sheet with readable,
labelled output.

> **Status — v1 shipped (inline-first).** The inline `scenario[axis](...)`
> constructor, align/broadcast/cross arithmetic (256-cell cap),
> `pick(x, axis = "coord")`, and reducers' `over <axis>` are implemented and
> tested (`tests/scenario.test.ts`). **Not yet built:** the multi-line
> `scenario axis:` table block below, and richer ≥2-axis grid rendering beyond
> the one-line `case: low=…, base=…` fallback the engine emits today. The table
> block needs a multi-line indentation-block parser the engine lacks — it is
> strictly one statement per line today (`index.ts:evalSheet` maps each raw
> line independently). That block layer is the shared prerequisite for both
> this table and the `correlate` block (`correlation.md`). Everything else in
> this document describes the intended end state.

Design principle for this feature (and the whole new-feature set): **explicit
over implicit**. No behaviour is triggered by argument position, argument type,
or statement order — only by an explicit name or block.

## The one idea

calcy's value already carries **metadata alongside the magnitude** (`dim`,
`unitHint`, affine/log/temp tags in `value.ts`). A scenario is the same move: a
value gains one or more **named axes**, each an ordered set of labelled
coordinates, and every axis multiplies the value's shape.

**Canonical terms** (use in code and docs):

- **axis** — a named, ordered set of **coordinates**, e.g. axis `case` with
  coords `low, base, high`.
- **coordinate** (**coord**) — one labelled point on an axis (`low`).
- **cell** — one combination of coords across all of a value's axes
  (`case=low, geo=us`). Each cell holds a full scalar/distribution.
- **sample axis** — the existing Monte-Carlo dimension (N draws). Special: it is
  **shared/broadcast, never crossed** (see "Sampling").

## Declaring — two surfaces, one meaning

Both forms produce the same thing: a value carrying a named axis. The table is
canonical; the inline constructor is shorthand for a single-row table.

### Canonical — the scenario table (shared axis, many variables)

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

Alignment is **visual**: low pairs with low. Because same-table variables share
the axis, they **zip** — they never cross. This is what rejects pure-Cartesian
Variant B.

### Shorthand — inline constructor (a lone variable)

```
tier = scenario[case](low: 8, base: 10, high: 14) $
```

Desugars to a one-row `scenario case:` table. Axis name and coord labels are
always explicit — there is no positional/anonymous form. (The
`where price = [10, 20, 30]` positional sugar from earlier drafts is **dropped
entirely**.)

## Alignment rules (the core semantics)

When a binary op combines `L` and `R`, resolve axis sets by name:

1. **Same axis name in both** → **align** (zip). Coords must match exactly
   (labels + order); result keeps that one axis. Mismatch under a shared name is
   a **hard error** ("axis `case`: left has low/base/high, right has low/high").
2. **Axis name in one only** → **broadcast**: add the axis; repeat the other
   operand across its coords.
3. **Different axis names** → **cross** (Cartesian). Result carries both axes.
4. **No axes** → today's scalar/sample path, unchanged.

Cross-vs-align is decided by the axis *name* — which the author typed — so it is
explicit, not implicit magic:

```
scenario case: ...                         # axis `case` (3 coords)
region = scenario[geo](us: 1.0, eu: 1.2)   # axis `geo`  (2 coords)
total = margin * region                     # case × geo → 6 cells
```

## Sampling — common random numbers

When a scenario axis coexists with the sample axis, every cell draws from the
**same underlying random stream**. A difference between `case=low` and
`case=high` must reflect the assumption, not sampling noise. The sample axis is
always the innermost, shared dimension and is never a crossable axis. (This is
the same correlation-by-reuse principle the engine already relies on;
`closed-form.ts:24`.)

**Implementation caveat**: sharing a stream aligns draws exactly only for
inverse-CDF samplers (normal, lognormal, uniform, exponential, weibull). The
beta/PERT samplers use Marsaglia–Tsang rejection (`mc.ts:207`), which consumes
a *variable* number of uniforms per draw — a naive shared stream desynchronizes
after the first rejection. Fix: give each draw index its own substream (e.g. a
counter-based RNG keyed by `(seed, draw_index)`), so cell k's draw i always
starts from the same state regardless of how many uniforms other draws
consumed. Decide this before building; it constrains the RNG choice.

## Selecting a coord — `pick`

```
base_margin = pick(margin, case = "base")
```

A plain function call with a keyword naming the axis — no new operator, no
type/position overload. (`@`-style selection was considered and rejected as a
sigil that only means something in scenario-land.)

Coord labels are **quoted strings**. A bare identifier on the RHS (`case =
base`) would be ambiguous with a variable named `base`; quoting removes the
ambiguity entirely. A bare identifier there is a parse error with a hint to
quote. (Table column headers stay unquoted — they are in header position, where
nothing else can appear.)

## Collapsing an axis — reducers gain `over <axis>`

One mechanism, explicit about which axis it collapses. Omitting `over` reduces
the **sample axis** (today's behaviour), so the two reductions never share an
implicit default:

```
worst  = min(total over case)          # collapse axis `case` by min
best   = max(total, over = case)       # kwarg form — same meaning
avg    = mean(total over case)
```

**Both spellings are supported** and mean the same thing: the prose form
`min(total over case)` and the kwarg form `min(total, over = case)`. The prose
form parses as sugar for the kwarg form; `over` is a contextual keyword only
inside reducer call arguments, not reserved elsewhere. `over <axis>` extends
the existing reducers (`min`/`max`/`mean`/…). No separate `across`/`reduce`
combinator — that would be a second name for the same idea.

## Explosion guard

Aligned axes don't multiply; crosses do. Enforce a **cell-count cap** (config,
default e.g. 256). Over the cap → summary + a message naming the axes that drove
it. Never silently sample a subset of cells.

## Rendering (the gutter)

- **1 axis** → labelled table (coord → value), each value formatted as a scalar
  line is today.
- **2 axes** → labelled grid (rows × cols); heatmap when numeric and dense.
- **≥3 axes or > cap** → collapse to a summary with drill-down + an explicit
  "N cells, showing summary" note.

## Interaction with existing features

- **Units** — orthogonal; every cell shares the same `dim`. Axis metadata sits
  beside `dim`, propagated by the same evaluator paths.
- **Distributions** — each cell is a full distribution; `mean`/`p`/`sd` apply
  per cell and return a value with the same axes.
- **Reducers over lists** — a `list` (reducer input, `value.ts:36`) stays a
  distinct concept from an **axis** (labelled output). A reducer collapses a
  list to a scalar; it does not create an axis.
- **`correlate` block** — the scenario table already expresses *discrete*
  correlated cases (put high `cost` in the `low` column). `correlate` handles
  *continuous* distribution coupling. See `correlation.md`.

## Value-model sketch (`value.ts`)

```ts
export interface Axis {
  name: string;      // 'case', 'geo', …
  coords: string[];  // ordered labels: ['low','base','high']
}
// On Value: `axes?: Axis[]`. Cells stored row-major over `axes`; a value with
// no `axes` is exactly today's scalar/samples value (zero-cost).
```

The evaluator's binary-op path gains an **axis-resolution** step (align/cross
per the rules) computing the result axis list and the index mapping from each
operand's cells to result cells, then applies the existing scalar/sample op
cell-by-cell.

## Locked decisions

- Table (`scenario <axis>:`) is canonical; inline `scenario[axis](...)` is
  shorthand desugaring to a one-row table.
- No positional/anonymous coords anywhere.
- Selection = `pick(x, axis = "coord")` — coord labels quoted; bare identifier
  is a parse error.
- Axis reduction = reducers with `over <axis>` — prose form
  (`min(x over case)`) and kwarg form (`min(x, over = case)`) both supported,
  identical meaning; omitted → sample axis.
- Block delimiter is **indentation**, shared with the `correlate` block.

## Open questions

1. Coord-label formatting inside a grid cell (distribution summaries).
2. Cap behaviour details (hard error vs lazy summary).
3. Whether `pick` may take a partial coord spec on multi-axis values (returns a
   value with the remaining axes) — leaning yes.

## Non-goals (first build)

- Variant A positional broadcasting.
- Positional `where`-list expansion (dropped).
- Cross-cell correlation controls beyond common random numbers.
- Pivoting/reshaping axes as a user operation.
