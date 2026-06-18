# calcy — an uncertainty-aware unit calculator

A pure, offline, installable PWA notepad that does three things at once:

1. **Unit-aware math** — `5 km + 3 mi`, `60 km / 1 h → speed`, with strict
   dimensional checking (`5 km + 3 s` is an error, not a silent number).
2. **Uncertainty math** — `800 to 1200` is a 90% confidence interval; all
   arithmetic is Monte-Carlo, so ranges propagate through every operation.
3. **Rate reasoning** — type a rate (`12k req/s`) and instantly see it per
   second…year, and **accumulate** it over any window into a total.

Everything runs client-side. No backend, no accounts, no telemetry, no network
after install.

## The one idea behind it

> **Every value is a _distribution_ of a _dimensioned quantity_.**

- A plain number → a 1-sample, dimensionless distribution.
- An uncertain value (`5 to 10`) → an N-sample distribution.
- A rate (`req/s`) → a quantity whose dimension contains `time⁻¹`.
- **Time-base conversion** → re-expressing that quantity in other time units.
- **Accumulation** → multiplying a rate by a duration; `time⁻¹` cancels, leaving
  a total.

Once the engine handles _(samples × units)_, rates and accumulation fall out of
ordinary arithmetic — there is no separate "rate subsystem". A rate card is just
"multiply by one second/minute/…/year and format".

## Quick start

Uses **pnpm**.

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # static output in build/ — deployable to any static host
pnpm preview      # serve the production build locally
```

Quality gates:

```sh
pnpm check        # svelte-check + tsc
pnpm lint         # biome
pnpm format       # biome --write
pnpm test         # vitest (unit, property, golden)
pnpm mutation     # stryker mutation testing
```

## The expression language

A sheet is many lines; each line is an independent expression evaluated
top-to-bottom, with its result in the right-hand gutter. The in-app cheat sheet
(`⌘/`) has click-to-insert examples for all of this.

### Numbers, units, arithmetic

```
5 km + 3 mi                # unit-aware add (result in km)
60 km / 1 h                # compose dimensions → speed
1.2 GB in MB               # convert with `in` (`to` is for confidence intervals)
12_000 req/s               # `_` digit separators; `12k`/`1.2M` suffixes also work
5 km + 3 s                 # ERROR: incompatible dimensions
```

- Multiplication/division compose dimensions; `+`/`-` require matching
  dimensions; `^` takes a dimensionless exponent.
- **Conversion:** `expr in <unit>` or `expr to <unit>`. A top-level conversion
  also _pins_ the output unit.
- Output auto-formats with a sensible unit + SI prefix; a unit can be pinned.
- Number style is selectable: **Auto**, **compact** (`1.04B`), **newspaper**
  (`1.04 billion`), or **scientific** (`1.04e9`).

### Variables & comments

```
rate = 12_000 req/s        # assign a name
rate * 30 day              # reuse on later lines
# text after # is a comment; blank/comment lines produce no result
```

### Uncertainty

```
800 to 1200                # 90% CI (5th–95th pct). both>0 → lognormal; else normal
p10: 5, p90: 50            # pin your own two percentiles (fits normal/lognormal)
normal(mean, sd)
lognormal(p5, p95)
uniform(lo, hi)
beta(a, b)                 # dimensionless
mixture(d1, d2, …)         # equal-weight mixture of like-dimensioned dists
pert(lo, ml, hi)           # three-point (beta-PERT) estimate
triangular(lo, ml, hi)     # three-point (triangular) — flatter than pert
exponential(mean)          # wait time between events (carries mean's units)
poisson(mean)              # whole count of events; result carries the unit
discrete(w1, v1, w2, v2, …) # weighted scenarios: value vᵢ with prob ∝ wᵢ
```

- `poisson`/`discrete` open the **count/event** domain: e.g.
  `chance(poisson(1000) req > capacity)`. Poisson uses Knuth for small means
  and a rounded normal approximation for large ones.

#### Plain-English ranges

The same intervals can be written the way people speak — useful for
non-technical estimates:

```
two days to four days      # spelled-out numbers (also "twenty-five", "two hundred and fifty")
between 2 and 4 days       # natural range → 90% CI
3 ± 1 day                  # centre ± half-width (ASCII: 3 +- 1 day) → (2 to 4) day
about 5 days               # rough estimate ≈ ±10% (shorthand: ~5 days)
5 kilometers in km         # plural unit spellings resolve like the singular
```

- `about X` / `~X` is a deliberately light **±10%** range — a nudge, not a
  precise claim. For anything tighter or wider, write an explicit interval.
- `between`, `about`, and `and` are reserved words; spelled-out cardinals
  (`one`…`ninety`, `hundred`/`thousand`/`million`/`billion`) are read as
  numbers, so don't use them as variable names.

#### Conditioning, comparisons & scenarios

```
demand given demand > 0    # condition: keep only the draws where the predicate holds
chance(800 < demand < 1200) # chained comparison → odds it lands in a band
20% of 200                 # `%` is ×0.01; `of` multiplies → 40
revenue = price * qty where price = 10 to 20, qty = 100   # one-off locals, kept to the line
```

- `given` truncates a distribution to the draws satisfying a predicate (unlike
  `clamp`, which piles mass at the boundary). On a `beta` prior, `given k of n`
  still means the Bayesian update.
- Comparisons may be chained when they point the same way (`a < b < c`); mixing
  directions (`a < b > c`) is an error.
- `where` binds extra locals for a single expression; they don't leak into later
  lines. Later bindings may reference earlier ones and the surrounding sheet.

- All arithmetic is Monte-Carlo (default **N = 10 000** samples).
- **Correlation by reuse:** a variable stores its _sample array_, so `x - x` is
  exactly `0` and `x + x` is `2x` — same draws. Distinct distributions are
  independent.
- A distribution displays as median + 90% CI `[p5, p95]` with a histogram
  sparkline; tap to expand a plain-language summary ("most likely … usually
  between …"), with the full percentile table behind a disclosure.
- Errors show a plain-language explanation first; the precise developer message
  is on hover.
- Results are **deterministic** per sheet (seeded RNG); re-roll with `⌘↵`.

### Money formatting

Any value whose unit is a currency — `$`/`USD`/`usd`, `€`/`EUR`/`eur`, `£`/`GBP`/`gbp`,
`¥`/`JPY`/`jpy`, `₹`/`INR`/`rupee` — renders automatically with the symbol, two
decimals, and a thousands separator. Symbols work as a prefix or a postfix:

```
1234.5 $            # → $1,234.50
$1234.5             # → $1,234.50   (prefix works too)
₹2,500,000          # → ₹2,500,000.00
(1000 to 2000) €    # → €1,500.00 (€1,000.00 … €2,000.00)   (median + 90% CI)
```

Sign goes before the symbol (`-$42.00`), and `in $` still works for pinning.
Composite units like `$/hour` are not formatted as money — they're a rate, and
the user explicitly wants the breakdown.

### Custom currencies & FX

Each currency is its own dimension, so they never mix silently (`$1 + €1` is an
error). Mint your own with the `currency` directive — comma-separated names are
aliases that share one new dimension:

```
currency BTC, bitcoin       # a fresh currency dimension
10 BTC + 2 bitcoin          # → 12 BTC
```

Convert between currencies with a `bridge` exchange rate (there is no built-in FX
feed — you supply the rate), then `in … via`:

```
bridge usdinr = 83 ₹/$
1000 $ in INR via usdinr    # → ₹83,000.00

currency BTC
bridge btcusd = 50000 $/BTC
2 BTC in $ via btcusd       # → $100,000.00
```

### Lists & ranges

A **list** is an ordered sequence of like-dimensioned scalars. Use it to roll
your own data into calcy — past bills, observed samples, anything you'd paste
in:

```
sum([8200, 9100, 8800, 9500, 10200, 9400])      # past 6 months' cloud bills
mean([1, 2, 3, 4, 5])                            # ad-hoc average
discrete([1, 2, 3, 4, 5, 6])                     # a fair die — equal-weight scenarios
```

A **range** is a shortcut for an integer or stepped run:

```
sum(1..5)                  # → 15   (same as sum([1, 2, 3, 4, 5]))
sum(1..10 step 2)          # → 25   (1 + 3 + 5 + 7 + 9)
mean(1.0..2.0 step 0.5)    # → 1.5  (floats when bounds are fractional)
```

List-taking reducers are `sum`, `mean`, `min`, `max`. `median`, `sd`, and `p`
are distribution-only and reject lists with a hint. `discrete()` and
`mixture()` accept a list as equal-weight scenarios; the existing
`discrete(w1: v1, w2: v2, …)` form is unchanged.

### Reducers & math functions

Reducers collapse a distribution to a scalar:

```
mean(d)   median(d)   sd(d) / stdev(d)   p(d, q) / percentile(d, q)   min(d)   max(d)
```

Elementwise math:

```
sqrt(x)   abs(x)   ceil(x)   floor(x)   round(x)   exp(x)   ln(x) / log(x)   log10(x)
clamp(x, lo[, hi])   # keep x within bounds (2-arg = lower bound only)
cagr(start, end, periods)   # compound growth rate per period, (end/start)^(1/n)−1
```

(`exp`, `ln`, `log`, `log10` require a dimensionless argument.)

### Readable calls

Function calls can be written several ways — pick whichever reads best:

```
pert(low=2, likely=3, high=8)   # named arguments (order-free; aliases: lo/ml/hi…)
mean of (1 to 9)                # `f of x` for any one-argument call
(800 to 1200) |> p(0.95)        # pipe: feeds the left value as the first argument
(1 to 100) |> p(0.95) |> ceil   # pipes chain left-to-right
discrete(60%: 12, 40%: 20)      # `weight: value` pairs (also weights a mixture)
```

### Estimation

Roll uncertain tasks up into a project total and read off deadline odds:

```
design = 2 to 4 day        # a trailing unit covers both bounds (parens only for GB/s etc.)
backend = pert(5, 7, 14) day
sum(above)                 # sum every preceding result line; sum(a, b, …) also works
total = sum(above)
chance(total < 20 day)     # P(total < 20 day): a probability in 0…1
```

Comparison operators `<` `>` `<=` `>=` produce a dimensionless 0/1 mask;
`chance(pred)` is its mean. Summing reuses each task's samples, so the total is a
true Monte-Carlo convolution (correlation preserved), not worst-case stacking.
See [US-2](docs/stories/US-2-task-project-estimation.md).

### Rates & accumulation

```
12k req/s in req/day       # time-base conversion
rate * 30 day              # accumulate: time⁻¹ cancels → a total count
(2 to 5) MB/s * 1 day in TB    # uncertain rate, accumulated, converted
```

A result whose dimension contains `time⁻¹` is a **rate**: the UI shows a **Rate
Card** (the value per second / minute / hour / day / week / month / year) with an
**Accumulate over [period]** control and an optional growth rate.

### Custom units

```
unit sprint = 2 week       # define your own
unit req = 1               # a dimensionless "count" unit
```

### Built-in non-SI units

calcy ships with the units you'd want for everyday and engineering work —
currencies (`$`/`€`/`£`/`¥`), data (`B`/`bit`/`kbps`), counts
(`req`/`event`/`msg`/`call`/`user`/…), energy (`kWh`/`BTU`/`cal`), pressure,
force, magnetic, radiation, angles, and ratios (`%`/`ppm`). Carbon is built in
too: `gCO2`, `kgCO2`, `tCO2` (each its own base dim). Define your own above —
`unit foo = 7 m / 2 s` is a valid speed unit.

### Math constants & trig

`pi` (`π`), `tau` (`τ`), and `e` are built-in dimensionless constants;
`sin`/`cos`/`tan` and their inverses take a radian (dimensionless) argument, so
`sin(90 deg)` works because `deg` is a dimensionless angle:

```
1 / (2 * pi * sqrt(100 uH * 100 nF)) in kHz   → 50.3 kHz   (LC resonance)
sin(pi / 2)                                     → 1
```

### Logarithmic units (decibels)

`dB`, `dBm`, and `dBW` are power-domain decibels (factor 10). They linearise on
the way in and undo the log on the way out, so ordinary arithmetic flows in
linear units:

```
30 dBm in W              → 1 W          (0 dBm = 1 mW; every +10 dB is ×10 power)
0.1 W in dBm             → 20 dBm
3 dB                     → 1.995        (a bare dB is a dimensionless power ratio)
2 in dB                  → 3.01 dB
```

Because levels linearise, combine gains and losses with `*` and `/` (not `+`/`−`):
`0.1 W * (12 dB) / (80 dB) in dBm → -48 dBm` is a link budget. Amplitude/voltage
decibels (`dBV`, factor 20) are not yet included.

## Worked examples (golden tests)

```
# capacity
rate = 12_000 req/s
rate in req/day          → 1.04e9 req/day
rate * 30 day            → 3.11e10 req            (accumulation)

# uncertain rate + accumulation
load = (800 to 1200) req/s
load * 1 month           → ~2.1e9 to 3.2e9 req    (distribution)

# storage accrual
write = (2 to 5) MB/s
write * 1 day in TB      → ~0.17 to 0.43 TB

# correlation via reuse
x = 1 to 10
x - x                    → 0 (exactly), not a spread

# money formatting
price = 1234.5 $
price in $               → $1,234.50

# list literal + reducer
mean([8200, 9100, 8800, 9500, 10200])     → $9,160.00    (mean of past 5 bills)
```

See [`docs/stories/`](docs/stories/) for capability stories (e.g.
**[task & project estimation](docs/stories/US-2-task-project-estimation.md)**),
each with its own golden acceptance examples.

## UI

- **Notepad** (default on desktop) — code editor + result gutter, per-line copy.
- **Tape** (touch-friendly) — a running value with stacked operation rows;
  compiles to the same expression the engine evaluates.
- **Rate Card** — auto-shown for rates; time-base table + accumulation + growth.
- **Sensitivity** — which input drives the most output variance.
- **Sheets** — create / duplicate / rename / search (`⌘K`); auto-persisted.
- **Starter templates** — pre-filled sheets for common cases (project estimate,
  traffic forecast, capacity & headroom, cloud cost, Fermi estimate, events &
  bursts, carbon footprint).
- **Sharing & export** — share a sheet via URL hash; export the whole store as a
  portable `.sqlite` file.

Shortcuts: `⌘K` sheets · `⌘/` help · `⌘↵` re-roll · `Esc` close.

## Defined constants & conventions

These are explicit to avoid silent errors; month/year are user-toggleable.

| Constant | Value | Notes |
|---|---|---|
| `minute` / `hour` / `day` | 60 s / 3600 s / 86 400 s | |
| `week` | 7 day | |
| `month` | 30.436875 day | avg Gregorian; toggleable to 30 day |
| `year` | 365.25 day | Julian; toggleable to 365 |
| Confidence interval | 5th–95th percentile (90%) | |
| Default samples N | 10 000 | accuracy vs. live-eval latency |

## Architecture

All client-side. Two Web Workers keep the main thread free:

```
Svelte UI (SvelteKit, adapter-static)
  • Notepad / Tape · Rate Card · Distribution chips · Sensitivity
        │ postMessage (sheet/ops)              │ postMessage (queries)
        ▼                                      ▼
Engine Worker                            DB Worker
  • parse → AST                            • sqlite-wasm (OPFS SAH-pool VFS)
  • curated TS unit catalogue              • sheets / revisions / custom units
  • Monte-Carlo eval (seeded RNG,          • FTS5 search · settings
    correlation-by-reuse, scalar fast path)
```

Design decisions worth knowing:

- **Units are hand-owned TypeScript** (`src/lib/engine/units.ts`) — a curated,
  Frink-inspired catalogue with a generic SI-prefix expander, not a WASM units
  engine. One language, distribution-native value type, no Rust in the build.
- **Scalar fast path:** most lines are plain scalar math and stay scalar; a
  `Float64Array` of samples is allocated lazily, only when a value meets a
  distribution. This keeps live evaluation fast.
- **Persistence stores source text + seed, never the 10 000 samples** —
  distributions are recomputed deterministically on load, so the DB stays tiny
  and portable. The OPFS SAH-pool VFS needs no `SharedArrayBuffer`, so **no
  COOP/COEP headers** — it works on any static host.

### Project layout

```
src/
  routes/+page.svelte           app shell
  lib/
    engine/
      worker.ts  client.ts      engine worker + typed main-thread client
      parse.ts                  expression parser → AST
      eval.ts                   AST evaluator (units + Monte-Carlo ops)
      mc.ts                     samplers, RNG, summaries
      value.ts                  Value type + dimension-signature helpers
      units.ts                  curated unit catalogue + SI prefixes
      stats.ts  format.ts       reducers · result formatting
    db/
      worker.ts  client.ts      sqlite-wasm (OPFS) worker + client
    components/                 Notepad, Tape, RateCard, Sensitivity,
                                DistributionPanel, Sparkline, CodeEditor,
                                ResultsGrid, HelpPanel
    editor.ts  tape.ts  share.ts
tests/                          vitest: unit, property (fast-check), golden
docs/stories/                   capability stories (US-N)
```

## Testing

`pnpm test` runs the vitest suite — unit tests, **property tests** (fast-check,
e.g. unit-conversion round-trips and distribution invariants), and **golden
tests** that pin the acceptance examples above. `pnpm mutation` runs Stryker to
check the suite actually catches regressions. New behaviour should add golden
tests in the spec/story style.

## Privacy

Every computation is local. After install the app makes no network calls; there
is no account system, no server sync, no telemetry. Your sheets live in OPFS on
your device and leave only when _you_ export a `.sqlite` file or share a URL.

## Acknowledgements

calcy stands on the shoulders of these projects — code, data, and design were
adapted directly from them (see [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md)
for the full notices):

- **[Rink](https://github.com/tiffany352/rink-rs)** (tiffany352) — the unit
  catalogue and unit-aware evaluation. Rink's `definitions.units` data is
  GPL-3.0.
- **[Frink](https://frinklang.org/)** (Alan Eliasen) — the unit-aware
  expression language and the breadth of the units catalogue. Inspiration only;
  no Frink code is included.
- **[distribution-calculator-android](https://github.com/NunoSempere/distribution-calculator-android)**
  (Nuño Sempere, MIT) — the "every value is a distribution" model and the
  `lo to hi` confidence-interval syntax.
- **[numutil](https://github.com/naftaliharris/numutil)** (Naftali Harris, BSD)
  — spelled-out number parsing (the `and` connector) and the "newspaper" number
  format.

## Similar apps

If calcy isn't your fit, these are excellent — and worth learning from:

- **[Soulver](https://soulver.app/)** — natural-language notepad calculator.
- **[Numbat](https://numbat.dev/)** (and its predecessor Insect) — a
  unit-aware scientific calculator language.
- **[Qalculate!](https://qalculate.github.io/)** — a deep, unit-aware desktop
  calculator.
- **[Guesstimate](https://www.getguesstimate.com/)** — a spreadsheet for
  Monte-Carlo estimates.
- **[Squiggle](https://www.squiggle-language.com/)** — a language for
  probability distributions.

## License

GPL-3.0 — see [`LICENSE`](LICENSE). Third-party notices for adapted code, data,
and inspiration are in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
