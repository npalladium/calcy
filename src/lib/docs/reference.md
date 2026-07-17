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
0xFF + 0b1010               # hex and binary integer literals
5 km + 3 s                 # ERROR: incompatible dimensions
```

- Multiplication/division compose dimensions; `+`/`-` require matching
  dimensions; `^` takes a dimensionless exponent.
- Superscripts are shorthand: `m²`, `s⁻¹`, `9.8 m/s²` mean the same as `^2`,
  `^-1`, `^2` — accepted as input and used to render integer exponents.
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

- Arithmetic is **Monte-Carlo by default** (**N = 10 000** samples), with an
  analytical fast path: when a result stays in a known family (normal, lognormal,
  scalar × distribution), `mean` and percentiles come back exact rather than
  sampled.
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
₹2500000            # -> ₹2,500,000.00   (no commas in input; they're added on output)
(1000 to 2000) €    # -> ~€1,414 (€1,000 ... €2,000)   (median + 90% CI; lognormal, so the centre is the geometric mean, not €1,500)
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
sqrt(x)   abs(x)   ceil(x)   floor(x)   round(x, digits?)   exp(x)   ln(x) / log(x)   log10(x)
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
3 dB                     # -> 2            (≈1.995, a bare dB is a dimensionless power ratio)
2 in dB                  # -> 3.01 dB
```

Because levels linearise, combine gains and losses with `*` and `/` (not `+`/`-`):
`0.1 W * (12 dB) / (80 dB) in dBm` is a link budget. Amplitude/voltage decibels
(`dBV`, factor 20) are not yet included.

<!-- BEGIN GENERATED CATALOGUE -->

<!-- Auto-generated from units.ts / eval.ts / parse.ts. Do not edit by hand —
     run `pnpm gen:reference`. Guarded by tests/reference-catalogue.test.ts. -->

## Catalogue

A complete index, generated from the engine’s own tables, so it always matches what calcy actually accepts.

### Units

Every unit calcy ships with, grouped by quantity. A `\*` marks a metric unit that also accepts the full set of SI prefixes (`k`, `M`, `G`, `m`, `µ`, …). Names in parentheses are accepted synonyms.

- **Length** — `m`\* (meter, meters, metre, metres) · `km` (kilometer, kilometers) · `cm` (centimeter, centimeters) · `mm` (millimeter, millimeters) · `micron` (microns) · `angstrom` (angstroms, Å, Å) · `fermi` · `inch` (inches) · `mil` (thou) · `ft` (foot, feet) · `yd` (yard, yards) · `mi` (mile, miles) · `nmi` (nauticalmile, nauticalmiles) · `furlong` (furlongs) · `chain` (chains) · `rod` (rods, perch, pole) · `fathom` (fathoms) · `league` (leagues) · `pt` (point, points) · `pica` (picas) · `au` (AU, astronomicalunit) · `ly` (lightyear, lightyears) · `pc` (parsec, parsecs)
- **Area** — `m2` (sqm) · `km2` (sqkm) · `cm2` · `ha` (hectare, hectares) · `are` (ares) · `acre` (acres) · `barn` (barns) · `sqft` (sqfeet) · `sqmi` · `sqin`
- **Volume** — `m3` (cum) · `cc` (cm3) · `L`\* (l, liter, liters, litre, litres) · `mL` (ml, milliliter, milliliters) · `cL` (cl) · `dL` (dl) · `gal` (gallon, gallons) · `galuk` (impgal) · `qt` (quart, quarts) · `pint` (pints, pt_us) · `cup` (cups) · `floz` (fluidounce) · `tbsp` (tablespoon) · `tsp` (teaspoon) · `bbl` (barrel, barrels)
- **Mass** — `kg` (kilogram, kilograms) · `g`\* (gram, grams, gramme, grammes) · `t` (tonne, tonnes, metricton) · `lb` (lbs, pound, pounds) · `oz` (ounce, ounces) · `st` (stone, stones) · `grain` (grains) · `ct` (carat, carats) · `slug` (slugs) · `ton` (tons, shortton) · `longton` · `amu` (dalton, daltons, Da)
- **Time** — `s`\* (sec, secs, second, seconds) · `ms` (millisecond, milliseconds) · `min` (minute, minutes) · `h` (hr, hrs, hour, hours) · `day` (days, d) · `week` (weeks, wk) · `fortnight` (fortnights) · `month` (months, mo) · `year` (years, yr, yrs, y) · `decade` (decades) · `century` (centuries) · `millennium` (millennia)
- **Frequency** — `Hz`\* · `hertz` · `rpm` · `bpm`
- **Speed & acceleration** — `kph` (kmh, kmph) · `mph` · `fps` · `knot` (knots, kn, kt) · `mach` · `gal_accel` (galileo)
- **Force** — `N`\* · `newton` (newtons) · `dyn` (dyne, dynes) · `lbf` (poundforce) · `kgf` (kilogramforce) · `kip`
- **Pressure** — `Pa`\* · `pascal` (pascals) · `bar` (bars) · `mbar` (millibar) · `atm` (atmosphere, atmospheres) · `psi` · `barg` · `psig` · `bara` · `psia` · `torr` · `mmHg` · `inHg`
- **Energy** — `J`\* · `joule` (joules) · `erg` (ergs) · `cal` (calorie, calories) · `kcal` (Cal, kilocalorie) · `eV`\* (electronvolt) · `Wh` (watthour) · `kWh` (kilowatthour) · `MWh` · `GWh` · `BTU` (btu) · `therm` (therms) · `tonTNT` (tonsTNT)
- **Power** — `W`\* · `watt` (watts) · `hp` (horsepower) · `PS` (metrichorsepower)
- **Electrical & magnetic** — `A`\* · `amp` (amps, ampere, amperes) · `C`\* · `coulomb` (coulombs) · `Ah` (amphour) · `mAh` · `V`\* · `volt` (volts) · `ohm`\* · `Ω` (Ω, ohms) · `S`\* · `siemens` (mho) · `F`\* · `farad` (farads) · `H`\* · `henry` (henries) · `Wb`\* · `weber` (webers) · `T`\* · `tesla` (teslas) · `G_gauss` (gauss) · `dB` (decibel, decibels) · `dBm` · `dBW`
- **Temperature** — `K`\* (kelvin, kelvins) · `°C` (degC, celsius, Celsius) · `°F` (degF, fahrenheit, Fahrenheit) · `deltaC` (Cdeg, Δ°C, ΔC) · `deltaF` (Fdeg, Δ°F, ΔF) · `rankine` (degR)
- **Amount** — `mol`\* · `mole` (moles)
- **Light** — `cd`\* · `candela` (candelas) · `lm`\* · `lumen` (lumens) · `lx`\* · `lux`
- **Radiation** — `Bq`\* · `becquerel` · `Ci` (curie) · `Gy`\* · `gray` · `Sv`\* · `sievert` (sieverts)
- **Data** — `bit` (bits, b) · `B` (byte, bytes, octet, octets) · `nibble` (nybble) · `word` · `Qbit` (Qb) · `QB` · `Rbit` (Rb) · `RB` · `Ybit` (Yb) · `YB` · `Zbit` (Zb) · `ZB` · `Ebit` (Eb) · `EB` · `Pbit` (Pb) · `PB` · `Tbit` (Tb) · `TB` · `Gbit` (Gb) · `GB` · `Mbit` (Mb) · `MB` · `kbit` (kb) · `kB` · `KB` · `Kibit` · `KiB` · `Mibit` · `MiB` · `Gibit` · `GiB` · `Tibit` · `TiB` · `Pibit` · `PiB` · `Eibit` · `EiB` · `bps` · `kbps` · `Mbps` · `Gbps`
- **Angle** — `rad` (radian, radians) · `deg` (degree, degrees, °) · `grad` (gradian, gon) · `arcmin` (arcminute) · `arcsec` (arcsecond) · `turn` (turns, rev, revolution, revolutions) · `sr` (steradian)
- **Ratios** — `percent` (%) · `pp` (percentagepoint, percentagepoints) · `permille` (‰) · `ppm` · `pphm` · `ppb` · `ppt`
- **Counts** — `req` (reqs, request, requests) · `event` (events, evt) · `error` (errors, err) · `query` (queries, qry) · `op` (ops, operation, operations) · `msg` (msgs, message, messages) · `user` (users) · `hit` (hits) · `item` (items) · `click` (clicks) · `call` (calls) · `view` (views, impression, impressions) · `transaction` (transactions, txn, txns) · `packet` (packets, pkt) · `job` (jobs, task, tasks) · `count` (counts, thing, things, piece, pieces) · `dozen` (dozens) · `gross` · `score` · `thousand` · `million` · `billion` · `avogadro`
- **Currency** — `$` (usd, USD, dollar, dollars) · `cent` (cents) · `k$` (K$) · `€` (eur, EUR, euro, euros) · `£` (gbp, GBP, pound_sterling) · `¥` (jpy, JPY, yen) · `₹` (inr, INR, rupee, rupees)
- **Carbon** — `gCO2` (gCO2e) · `kgCO2` (kgCO2e) · `tCO2` (tCO2e, tonneCO2)

### Named constants

`pi` (π) · `tau` (τ) · `e` (euler) · `c` (lightspeed) · `gravity` (g0, standardgravity) · `G_grav` (gravitationalconstant)

### Keywords & directives

Reserved words — don’t use them as variable names.

| Keyword | Meaning |
|---|---|
| `in` | convert units, and pin the output unit |
| `to` | build a confidence-interval range (`lo to hi`) |
| `per` | rate connector — `12 req per second` (same as `/`) |
| `and` | join spelled-out numbers, and `between A and B` |
| `between` | `between A and B` — a natural 90% range |
| `about` | rough estimate, ±10% (also `~`) |
| `of` | `X of Y` multiplies; `f of x` calls a one-arg function |
| `step` | stepped range — `1..10 step 2` |
| `seen` | Bayesian update — `prior seen k of n` |
| `given` | condition a distribution — `d given pred`; `beta given k of n` |
| `every` | reserved for a future per-window operator (not yet bound) |
| `where` | one-off locals for a line — `expr where a = 1, b = 2` |
| `via` | pick a named bridge for a conversion — `in INR via fx` |
| `over` | collapse a scenario axis in a reducer — `min(total over case)` |
| `unit` | define your own unit — `unit sprint = 2 week` |
| `currency` | mint a currency dimension — `currency BTC, bitcoin` |
| `bridge` | name an exchange rate — `bridge fx = 83 ₹/$` |

### Functions

**Distributions**

| Call | What it does |
|---|---|
| `normal(mean, sd)` | Gaussian with the given mean and standard deviation. |
| `lognormal(p5, p95)` | Lognormal fitted to a 5th/95th-percentile range. |
| `uniform(lo, hi)` | Flat distribution between two bounds. |
| `beta(a, b)` | Beta distribution (dimensionless); a/b are pseudo-counts. |
| `pert(lo, ml, hi)` | Three-point beta-PERT estimate (low, most-likely, high). |
| `triangular(lo, ml, hi)` | Three-point triangular estimate; flatter than pert. |
| `exponential(mean)` | Wait time between events; carries the mean’s units. |
| `poisson(mean)` | Whole count of events at the given mean rate. |
| `weibull(shape, scale)` | Time-to-failure / reliability; scale carries the units, shape is dimensionless. |
| `binomial(trials, p)` | Whole count of successes in n independent trials (bounded by n). |
| `discrete(w1: v1, w2: v2, …)` | Weighted scenarios (or equal-weight from a list). |
| `mixture(d1, d2, …)` | Equal-weight (or weighted) mix of like-dimensioned distributions. |
| `ci(lo, hi[, level])` | Confidence interval as a function — the `lo to hi` form, with an optional level. |
| `correlate(reference, marginal, r)` | Couple a marginal to an existing distribution at rank correlation r, preserving its marginal exactly. |

**Reducers**

| Call | What it does |
|---|---|
| `mean(d)` | Average of a distribution (exact for known families). |
| `median(d)` | Middle value (50th percentile). |
| `mode(d)` | Most likely value (density peak); analytic for known families, else a smoothed estimate. |
| `skew(d)` | Asymmetry (Fisher–Pearson): positive = upside tail. Sample skew is high-variance. |
| `sd(d)` _(alias: `stdev`)_ | Standard deviation. |
| `p(d, q)` _(alias: `percentile`)_ | The q-quantile, q in 0…1. |
| `interval(d, level)` | The central [lo, hi] band at a confidence level, as a 2-element list. |
| `min(d) / min(list)` | Smallest value. |
| `max(d) / max(list)` | Largest value. |
| `sum(list) / sum(above)` | Total of a list, or of preceding result lines. |
| `chance(pred)` | Probability a predicate holds (mean of a 0/1 mask). |

**Scenarios**

| Call | What it does |
|---|---|
| `pick(scenario, axis = "coord")` | Select one coord of a scenario axis; a partial pick keeps the remaining axes. |

**Math**

| Call | What it does |
|---|---|
| `sqrt(x)` | Square root. |
| `abs(x)` | Absolute value. |
| `ceil(x)` | Round up to an integer. |
| `floor(x)` | Round down to an integer. |
| `round(x, digits?)` | Round to the nearest integer, or to an optional number of decimal places. |
| `exp(x)` | e to the power x (dimensionless). |
| `ln(x)` _(alias: `log`)_ | Natural logarithm (dimensionless). |
| `log10(x)` | Base-10 logarithm (dimensionless). |
| `clamp(x, lo[, hi])` | Keep x within bounds (2-arg = lower bound only). |
| `cagr(start, end, periods)` | Compound growth rate per period, (end/start)^(1/n)−1. |

**Trigonometry**

| Call | What it does |
|---|---|
| `sin(x)` | Sine; argument in radians (`deg` works). |
| `cos(x)` | Cosine; argument in radians. |
| `tan(x)` | Tangent; argument in radians. |
| `asin(x)` | Inverse sine; returns radians. |
| `acos(x)` | Inverse cosine; returns radians. |
| `atan(x)` | Inverse tangent; returns radians. |

**Inference**

| Call | What it does |
|---|---|
| `update(prior, k, n)` | Bayesian update of a beta prior with k successes in n trials (also `prior seen k of n`). |

**Tiered**

| Call | What it does |
|---|---|
| `bracket(x, u1: r1, …[, total=yes])` | Piecewise-constant tiers: marginal rate at x, or cumulative total with total=yes. |

<!-- END GENERATED CATALOGUE -->

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
rate in req/day          # -> 1.04B req/day
rate * 30 day            # -> 31.1B req              (accumulation)

# uncertain rate + accumulation
load = (800 to 1200) req/s
load * 1 month           # -> ~2.1B to 3.2B req      (distribution)

# storage accrual
write = (2 to 5) MB/s
write * 1 day in TB      # -> ~0.17 to 0.43 TB

# correlation via reuse
x = 1 to 10
x - x                    # -> 0    (exactly), not a spread

# money formatting
price = 1234.5 $
price in $               # -> $1,234.50
```
