# US-3 — Traffic load forecasting

> **As** an engineer doing capacity planning,
> **I want** to express an uncertain traffic load, derive its peak from the
> average, see it across every time base, and project it forward at a growth
> rate,
> **so that** I can answer "what load are we actually planning for — now and in
> N months?" with an honest range rather than a single optimistic number.

This is the **demand side**. The companion story [US-4](US-4-capacity-headroom-and-sizing.md)
is the **supply side** (capacity headroom and resource sizing); together they
cover capacity planning end to end.

## Why this fits calcy

A load is a rate — a quantity with `time⁻¹` — which the engine already detects,
renders as a Rate Card (per second … per year), and accumulates over a window.
Counts like `req`, `user`, `op`, `query`, `msg` are built-in units (each its own
base dimension), so labels survive the arithmetic. Uncertainty (`(lo to hi)`),
the peak-to-average multiplier, and growth (`^`) all compose without new
machinery — this story is **pure composition of existing primitives**.

## The flow

```
# uncertain average load (parenthesise the CI so req/s covers both bounds)
avg  = (8000 to 12000) req/s

# peak load = average × an uncertain peak-to-average factor
peak = avg * (2 to 3)            → distribution-valued req/s; Rate Card shows
                                   per-minute … per-year automatically

# how many requests does the peak hour serve?
peak * 1 hour                    → requests in a peak hour (uncertain total)

# project the average forward 12 months at 8%/month growth
projected = avg * 1.08^12        → ~2.5× today's load, with the range carried through
```

- **Peak vs average** is just multiplication by a (possibly uncertain) factor;
  the result is still a rate, so its Rate Card and accumulation work unchanged.
- **Growth projection** uses the `^` operator: `avg * (1 + g)^n`. For
  *accumulating* a growing rate over a window (not just the end value), the Rate
  Card's existing **Accumulate over [period] with growth** control sums the
  geometric series.
- Everything stays a distribution: `projected`'s Rate Card and totals are
  uncertain, with median + 90% CI.

## Additions this story needs

**None.** US-3 is composition only — CI literals, multiplication, `^`, the Rate
Card, and growth-accumulation all already exist. (Crossing-a-threshold odds —
"how likely is next year's load above X" — reuse `chance`/comparison from
[US-2](US-2-task-project-estimation.md).)

## Acceptance criteria (golden tests)

```
# peak is a rate and strictly above the average's upper bound on expectation
avg  = (8000 to 12000) req/s
peak = avg * (2 to 3)
peak                              → isRate; median ≈ 25k req/s (≈ 10k × 2.5)

# rate card "per second" equals the base value (already guaranteed by the engine)
peak in req/minute                → ≈ 60 × the per-second median

# growth projection compounds
base = 1000 req/s
base * 1.08^12                    → ≈ 2518 req/s   (1.08^12 ≈ 2.518)

# threshold odds reuse US-2
load = (20000 to 30000) req/s
chance(load > 28000 req/s)        → a probability in [0,1]
```

## Out of scope

- Solving for **when** load crosses a capacity (an equation solve over `n`) — the
  engine is not a solver. The user sweeps horizons manually
  (`base * 1.08^6`, `…^12`, `…^18`) or checks `chance(projected > capacity)`.
- Modelling **non-constant** growth (seasonality, S-curves) beyond constant rate
  and simple compounding.
- Correlated diurnal/weekly load *shapes* — peak is captured as a single factor,
  not a time series.

## Personas served

- **Capacity planner** — "we serve ~10k req/s on average, peaks at 2–3×; what are
  we provisioning for, and what will it be next year?"
- **SRE / on-call** — sizes headroom against the *peak* distribution, not the
  average (continues in US-4).
