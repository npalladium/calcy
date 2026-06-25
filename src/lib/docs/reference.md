# calcy reference

The full expression language. A sheet is many lines; each line is an independent
expression evaluated top-to-bottom, with its result in the right-hand gutter. The
in-app cheat sheet (`⌘/`) has click-to-insert examples for all of this.

## Numbers, units, arithmetic

```
5 km + 3 mi                # unit-aware add (result in km)
60 km / 1 h                # compose dimensions -> speed
1.2 GB in MB               # convert with `in` (`to` is for confidence intervals)
12_000 req/s               # `_` digit separators; `12k`/`1.2M` suffixes also work
5 km + 3 s                 # ERROR: incompatible dimensions
```

- Multiplication/division compose dimensions; `+`/`-` require matching
  dimensions; `^` takes a dimensionless exponent.
- **Conversion:** `expr in <unit>` or `expr to <unit>`. A top-level conversion
  also pins the output unit.
- Results display in the unit you typed; without one, calcy picks a sensible unit
  and SI prefix.
- Number style is selectable: **Auto**, **compact** (`1.04B`), **newspaper**
  (`1.04 billion`), or **scientific** (`1.04e9`).

## Variables & comments

```
rate = 12_000 req/s        # assign a name
rate * 30 day              # reuse on later lines
# text after # is a comment; blank/comment lines produce no result
```

## Uncertainty

```
800 to 1200                # 90% CI (5th-95th pct). both>0 -> lognormal; else normal
p10: 5, p90: 50            # pin your own two percentiles (fits normal/lognormal)
normal(mean, sd)
lognormal(p5, p95)
uniform(lo, hi)
beta(a, b)                 # dimensionless
mixture(d1, d2, ...)       # equal-weight mixture of like-dimensioned dists
pert(lo, ml, hi)           # three-point (beta-PERT) estimate
triangular(lo, ml, hi)     # three-point (triangular) - flatter than pert
exponential(mean)          # wait time between events (carries mean's units)
poisson(mean)              # whole count of events; result carries the unit
discrete(w1, v1, w2, v2, ...) # weighted scenarios: value vi with prob proportional to wi
```

- `poisson`/`discrete` open the **count/event** domain: e.g.
  `chance(poisson(1000) req > capacity)`. Poisson uses Knuth for small means and
  a rounded normal approximation for large ones.

### Plain-English ranges

The same intervals can be written the way people speak, useful for non-technical
estimates:

```
two days to four days      # spelled-out numbers (also "twenty-five", "two hundred and fifty")
between 2 and 4 days       # natural range -> 90% CI
3 ± 1 day                  # centre ± half-width (ASCII: 3 +- 1 day) -> (2 to 4) day
about 5 days               # rough estimate ~ ±10% (shorthand: ~5 days)
5 kilometers in km         # plural unit spellings resolve like the singular
```

- `about X` / `~X` is a deliberately light **±10%** range, a nudge rather than a
  precise claim. For anything tighter or wider, write an explicit interval.
- `between`, `about`, and `and` are reserved words; spelled-out cardinals
  (`one`...`ninety`, `hundred`/`thousand`/`million`/`billion`) are read as
  numbers, so don't use them as variable names.

### Conditioning, comparisons & scenarios

```
demand given demand > 0    # condition: keep only the draws where the predicate holds
chance(800 < demand < 1200) # chained comparison -> odds it lands in a band
20% of 200                 # `%` is x0.01; `of` multiplies -> 40
revenue = price * qty where price = 10 to 20, qty = 100   # one-off locals, kept to the line
```

- `given` truncates a distribution to the draws satisfying a predicate (unlike
  `clamp`, which piles mass at the boundary). On a `beta` prior, `given k of n`
  still means the Bayesian update.
- Comparisons may be chained when they point the same way (`a < b < c`); mixing
  directions (`a < b > c`) is an error.
- `where` binds extra locals for a single expression; they don't leak into later
  lines. Later bindings may reference earlier ones and the surrounding sheet.

### How uncertainty behaves

- All arithmetic is Monte-Carlo (default **N = 10 000** samples).
- **Correlation by reuse:** a variable stores its sample array, so `x - x` is
  exactly `0` and `x + x` is `2x` (same draws). Distinct distributions are
  independent.
- A distribution displays as median + 90% CI `[p5, p95]` with a histogram
  sparkline; tap to expand a plain-language summary ("most likely ... usually
  between ..."), with the full percentile table behind a disclosure.
- Errors show a plain-language explanation first; the precise developer message
  is on hover.
- Results are **deterministic** per sheet (seeded RNG); re-roll with `⌘↵`.

## Money formatting

Any value whose unit is a currency (`$`/`USD`/`usd`, `€`/`EUR`/`eur`,
`£`/`GBP`/`gbp`, `¥`/`JPY`/`jpy`, `₹`/`INR`/`rupee`) renders automatically with
the symbol, two decimals, and a thousands separator. Symbols work as a prefix or
a postfix:

```
1234.5 $            # -> $1,234.50
$1234.5             # -> $1,234.50   (prefix works too)
₹2,500,000          # -> ₹2,500,000.00
(1000 to 2000) €    # -> €1,500.00 (€1,000.00 ... €2,000.00)   (median + 90% CI)
```

Sign goes before the symbol (`-$42.00`), and `in $` still works for pinning.
Composite units like `$/hour` are not formatted as money; they're a rate, and the
breakdown is what you want.

## Custom currencies & FX

Each currency is its own dimension, so they never mix silently (`$1 + €1` is an
error). Mint your own with the `currency` directive; comma-separated names are
aliases that share one new dimension:

```
currency BTC, bitcoin       # a fresh currency dimension
10 BTC + 2 bitcoin          # -> 12 BTC
```

Convert between currencies with a `bridge` exchange rate (there is no built-in FX
feed, you supply the rate), then `in ... via`:

```
bridge usdinr = 83 ₹/$
1000 $ in INR via usdinr    # -> ₹83,000.00

currency BTC
bridge btcusd = 50000 $/BTC
2 BTC in $ via btcusd       # -> $100,000.00
```

## Lists & ranges

A **list** is an ordered sequence of like-dimensioned scalars. Use it to roll
your own data into calcy: past bills, observed samples, anything you'd paste in:

```
sum([8200, 9100, 8800, 9500, 10200, 9400])      # past 6 months' cloud bills
mean([1, 2, 3, 4, 5])                            # ad-hoc average
discrete([1, 2, 3, 4, 5, 6])                     # a fair die, equal-weight scenarios
```

A **range** is a shortcut for an integer or stepped run:

```
sum(1..5)                  # -> 15   (same as sum([1, 2, 3, 4, 5]))
sum(1..10 step 2)          # -> 25   (1 + 3 + 5 + 7 + 9)
mean(1.0..2.0 step 0.5)    # -> 1.5  (floats when bounds are fractional)
```

List-taking reducers are `sum`, `mean`, `min`, `max`. `median`, `sd`, and `p`
are distribution-only and reject lists with a hint. `discrete()` and `mixture()`
accept a list as equal-weight scenarios; the `discrete(w1: v1, w2: v2, ...)` form
is unchanged.

## Reducers & math functions

Reducers collapse a distribution to a scalar:

```
mean(d)   median(d)   sd(d) / stdev(d)   p(d, q) / percentile(d, q)   min(d)   max(d)
```

Elementwise math:

```
sqrt(x)   abs(x)   ceil(x)   floor(x)   round(x)   exp(x)   ln(x) / log(x)   log10(x)
clamp(x, lo[, hi])   # keep x within bounds (2-arg = lower bound only)
cagr(start, end, periods)   # compound growth rate per period, (end/start)^(1/n)-1
```

(`exp`, `ln`, `log`, `log10` require a dimensionless argument.)

## Readable calls

Function calls can be written several ways; pick whichever reads best:

```
pert(low=2, likely=3, high=8)   # named arguments (order-free; aliases: lo/ml/hi...)
mean of (1 to 9)                # `f of x` for any one-argument call
(800 to 1200) |> p(0.95)        # pipe: feeds the left value as the first argument
(1 to 100) |> p(0.95) |> ceil   # pipes chain left-to-right
discrete(60%: 12, 40%: 20)      # `weight: value` pairs (also weights a mixture)
```

## Estimation

Roll uncertain tasks up into a project total and read off deadline odds:

```
design = 2 to 4 day        # a trailing unit covers both bounds (parens only for GB/s etc.)
backend = pert(5, 7, 14) day
sum(above)                 # sum every preceding result line; sum(a, b, ...) also works
total = sum(above)
chance(total < 20 day)     # P(total < 20 day): a probability in 0...1
```

Comparison operators `<` `>` `<=` `>=` produce a dimensionless 0/1 mask;
`chance(pred)` is its mean. Summing reuses each task's samples, so the total is a
true Monte-Carlo convolution (correlation preserved), not worst-case stacking.

## Rates & accumulation

```
12k req/s in req/day       # time-base conversion
rate * 30 day              # accumulate: time^-1 cancels -> a total count
(2 to 5) MB/s * 1 day in TB    # uncertain rate, accumulated, converted
```

A result whose dimension contains `time^-1` is a **rate**: the UI shows a **Rate
Card** (the value per second / minute / hour / day / week / month / year) with an
**Accumulate over [period]** control and an optional growth rate.

## Custom units

```
unit sprint = 2 week       # define your own
unit req = 1               # a dimensionless "count" unit
```

## Built-in non-SI units

calcy ships with the units you'd want for everyday and engineering work:
currencies (`$`/`€`/`£`/`¥`), data (`B`/`bit`/`kbps`), counts
(`req`/`event`/`msg`/`call`/`user`/...), energy (`kWh`/`BTU`/`cal`), pressure,
force, magnetic, radiation, angles, and ratios (`%`/`ppm`). Carbon is built in
too: `gCO2`, `kgCO2`, `tCO2` (each its own base dim). Define your own above:
`unit foo = 7 m / 2 s` is a valid speed unit.

## Math constants & trig

`pi` (`π`), `tau` (`τ`), and `e` are built-in dimensionless constants;
`sin`/`cos`/`tan` and their inverses take a radian (dimensionless) argument, so
`sin(90 deg)` works because `deg` is a dimensionless angle:

```
1 / (2 * pi * sqrt(100 uH * 100 nF)) in kHz   # -> 50.3 kHz   (LC resonance)
sin(pi / 2)                                    # -> 1
```

## Logarithmic units (decibels)

`dB`, `dBm`, and `dBW` are power-domain decibels (factor 10). They linearise on
the way in and undo the log on the way out, so ordinary arithmetic flows in
linear units:

```
30 dBm in W              # -> 1 W          (0 dBm = 1 mW; every +10 dB is x10 power)
0.1 W in dBm             # -> 20 dBm
3 dB                     # -> 1.995        (a bare dB is a dimensionless power ratio)
2 in dB                  # -> 3.01 dB
```

Because levels linearise, combine gains and losses with `*` and `/` (not `+`/`-`):
`0.1 W * (12 dB) / (80 dB) in dBm` is a link budget. Amplitude/voltage decibels
(`dBV`, factor 20) are not yet included.

## Defined constants & conventions

These are explicit to avoid silent errors; month/year are user-toggleable in
settings.

| Constant | Value | Notes |
|---|---|---|
| `minute` / `hour` / `day` | 60 s / 3600 s / 86 400 s | |
| `week` | 7 day | |
| `month` | 30.436875 day | avg Gregorian; toggleable to 30 day |
| `year` | 365.25 day | Julian; toggleable to 365 |
| Confidence interval | 5th-95th percentile (90%) | |
| Default samples N | 10 000 | accuracy vs. live-eval latency |

## Worked examples

```
# capacity
rate = 12_000 req/s
rate in req/day          # -> 1.04e9 req/day
rate * 30 day            # -> 3.11e10 req            (accumulation)

# uncertain rate + accumulation
load = (800 to 1200) req/s
load * 1 month           # -> ~2.1e9 to 3.2e9 req    (distribution)

# storage accrual
write = (2 to 5) MB/s
write * 1 day in TB      # -> ~0.17 to 0.43 TB

# correlation via reuse
x = 1 to 10
x - x                    # -> 0 (exactly), not a spread

# money formatting
price = 1234.5 $
price in $               # -> $1,234.50
```
