# US-2 — Task & project estimation

> **As** someone breaking a project into tasks (an eng lead sizing a release, a
> freelancer quoting a job, a PM forecasting a delivery date),
> **I want** to write each task as an uncertain estimate and roll them up into a
> project total,
> **so that** I get an honest median **and a 90% range** for the whole project —
> and can read off the **chance of hitting a deadline** instead of pretending a
> single number is the truth.

## Why this fits calcy

The core type is already _"a distribution of a dimensioned quantity"_. A task
estimate is exactly that: `(3 to 8) day` is a 90% CI in time units. Summing tasks
is ordinary addition of distributions; the project total carries its own CI for
free. This story is mostly **composition of existing primitives** plus three
small conveniences (below). No new value type, no new view is _required_ for the
core flow — the notepad already does it.

> Syntax note: `2 to 4 day` works — a trailing single unit distributes over both
> bounds. Parenthesise (`(2 to 4) GB/s`) only for compound units, and the error
> message points you there when needed.
>
> The same estimate can be phrased in plain English for non-technical users:
> `two days to four days`, `between 2 and 4 days`, `3 ± 1 day`, or `about 5 days`
> (a rough ±10%). See the README's _Plain-English ranges_.

## The flow

```
# each task: low to high in the same time unit  → 90% CI
design   = 2 to 4 day
backend  = 5 to 12 day
frontend = 4 to 9 day
qa       = 1 to 3 day

design + backend + frontend + qa        → median + 90% CI for the project
sum(above)                              → same thing, no need to list each task
```

Because variables hold their _sample array_, the total is a proper Monte-Carlo
convolution of the tasks, not a naive lo+lo … hi+hi (which would overstate the
range). Reuse stays correlated (`a - a == 0`), distinct tasks stay independent.

## Additions this story ships

Implemented in `src/lib/engine/` (sampler in `mc.ts`, functions + comparison
operators in `eval.ts`/`parse.ts`, `above` threading in `index.ts`); covered by
`tests/estimation.test.ts`:

| Addition | Form | Meaning |
|---|---|---|
| Three-point estimate | `pert(lo, ml, hi)` | Beta-PERT distribution from optimistic / most-likely / pessimistic. Mean `= (lo + 4·ml + hi)/6`; mode at `ml`; support `[lo, hi]`. Joins the `normal/lognormal/uniform/beta` family. |
| Roll-up | `sum(above)` and `sum(a, b, …)` | `above` sums every preceding result-bearing line on the sheet; the variadic form sums an explicit list. Distributions add elementwise; correlation-by-reuse preserved, so `sum(a, b)` == `sum(above)` for those lines. |
| Comparison | `a < b`, `>`, `<=`, `>=` | Yields a dimensionless per-sample 0/1 mask (operands must share units). Non-associative. |
| Deadline odds | `chance(total < 30 day)` | Mean of the predicate mask — the probability (dimensionless, `0…1`) the predicate holds across the samples. |

> Naming: `chance` is used (not `p`) because `p(dist, q)` is already the
> percentile reducer.

## Acceptance criteria (golden tests)

Encoded in `tests/estimation.test.ts`.

```
# three-point estimate — mean = (2 + 4·3 + 8)/6 = 3.67, support within [2, 8]
pert(2, 3, 8) day                 → dist, mean ≈ 3.67 day

# project roll-up over uncertain tasks
a = (2 to 4) day
b = (5 to 12) day
c = (1 to 3) day
sum(above)                        → dist; p95 strictly below a.p95+b.p95+c.p95
                                    (convolution, not worst-case stacking)

# explicit roll-up matches `above` (identical draws)
sum(a, b, c)                      → same distribution as sum(above) and a+b+c

# deadline odds (complementary events sum to exactly 1)
total = (10 to 20) day
chance(total < 15 day)            → a probability in [0,1] (dimensionless)

# dimensional safety still applies
sum(2 day, 3 kg)                  → error: incompatible dimensions
1 day < 2 kg                      → error: cannot compare
```

## Out of scope (for this story)

- Task **dependencies / sequencing / critical path** — US-2 sums independent
  task durations; it does not model a schedule. (Possible future US.)
- A dedicated task-list UI with rows and a deadline gauge — the notepad covers
  the flow; a bespoke view is a separate, larger story if demand appears.
- Per-task **variance attribution** is already served by the existing
  Sensitivity view (`src/lib/components/Sensitivity.svelte`); US-2 only needs to
  ensure summed estimates flow into it.

## Personas served

- **Eng lead / sprint** — sizes a feature, forecasts total effort and the odds of
  fitting it in the sprint.
- **Freelancer quoting** — task hours × hourly rate → an uncertain quote with a
  defensible range.
- **PM / delivery** — sums durations, reads `chance(total < deadline)` to commit
  to a date with eyes open.
