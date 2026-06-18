# Closed-form distributions for calcy

Status: proposal (not yet implemented in this branch).

## The problem

calcy defaults to N = 10 000 Monte-Carlo samples for *every* distribution and
*every* operation. This is the wrong default for an uncertainty calculator.

- A user who writes `2 to 10` and then `p(x, 0.5)` is asking for the *median*
  of a distribution whose median is known exactly. We sample 10 000 draws,
  sort them, pick element 5000, and tell them that's the median.
- `chance(a < b)` where both `a` and `b` are closed-form normals is one
  `Φ`-call. We do 10 000 + 10 000 draws and count.
- `update(beta(2, 8), 3, 10)` returns a posterior whose moments are exact;
  we sample it from scratch instead of reading off the new `(a, b)`.

Sample noise is unnecessary; latency is wasted; `p(p(x, 0.5), 0.5)` doesn't
even mean anything (a percentile of a percentile isn't defined).

## What calcy already has

Most constructors stamp a parametric identity when one exists:

- `beta(a, b)` → `meta: { kind: 'beta', a, b }`
- `lognormal(p5, p95)` → `meta: { kind: 'lognormal', mu, sigma }`

But the meta is currently read by `update()` only. Everywhere else, the
sample array is the source of truth.

## Phased adoption

### Phase 1 — store params, fall back to samples

Extend `meta` to every parametric constructor:

| Function    | Meta                                          |
|-------------|-----------------------------------------------|
| `normal`    | `{ kind: 'normal', mean, sd }`                |
| `lognormal` | `{ kind: 'lognormal', mu, sigma }` (done)     |
| `uniform`   | `{ kind: 'uniform', lo, hi }`                 |
| `exponential` | `{ kind: 'exponential', mean }`             |
| `poisson`   | `{ kind: 'poisson', lambda }`                 |
| `beta`      | `{ kind: 'beta', a, b }` (done)               |
| `pert`      | `{ kind: 'pert', alpha, beta }` (Beta-derived)|
| `triangular`| `{ kind: 'triangular', lo, mode, hi }`       |

Downstream ops *check* `meta` and prefer analytical paths when available;
otherwise they sample as today. No behaviour change yet.

### Phase 2 — analytical `p(d, q)` and `mean(d)`

Replace `reducePercentile` for parametric distributions with closed-form
inverse CDFs:

- `normal.p(q) = μ + σ · Φ⁻¹(q)`
- `lognormal.p(q) = exp(μ + σ · Φ⁻¹(q))`
- `uniform.p(q) = lo + (hi − lo) · q`
- `exponential.p(q) = −mean · ln(1 − q)`
- `poisson.p(q)` — no closed form, keep sample interpolation
- `beta.p(q)` — regularised incomplete beta inverse, one function call

Same for `mean(d)`:

- `normal.mean = μ`
- `lognormal.mean = exp(μ + σ²/2)`
- `uniform.mean = (lo + hi) / 2`
- `exponential.mean = mean`
- `poisson.mean = λ`
- `beta.mean = a / (a + b)`

This is the highest-value change: it fixes the percentile-of-percentile
problem (which currently silently gives nonsense) and makes `chance(...)`
exact.

### Phase 3 — analytical arithmetic

Stop sampling when the result is itself a known family:

- `normal(μ₁, σ₁) + normal(μ₂, σ₂)` → `normal(μ₁ + μ₂, √(σ₁² + σ₂²))`
- `lognormal(μ₁, σ₁) · lognormal(μ₂, σ₂)` → `lognormal(μ₁ + μ₂, √(σ₁² + σ₂²))`
- `lognormal(μ₁, σ₁) / lognormal(μ₂, σ₂)` → `lognormal(μ₁ − μ₂, √(σ₁² + σ₂²))`
- `normal(μ, σ) · k` → `normal(k·μ, |k|·σ)`
- `normal(μ, σ) + k` → `normal(μ + k, σ)`
- `chance(a < b)` for two independent normals → `Φ((μ_b − μ_a) / √(σ_a² + σ_b²))`

The Drake equation, the S3 cost example, and any product of (log)normals
all collapse to a single closed-form lognormal. No sampling required.

### Phase 4 — exact operations on mixtures

- `update(beta(a, b), k, n)` → `beta(a + k, b + n − k)` (already done in
  branch; needs to skip resampling)
- `mean(d)` over a list of parametric distributions of the same family →
  exact moments
- `chance(X < k)` for a Beta — `I_k(a, b)` (regularised incomplete beta)

## Where MC stays correct

- Sums of ≥ 3 distinct distributions from different families — the
  convolution has no simple form
- `bracket(x, ..., total=yes)` when `x` is a distribution — piecewise
  integration is fine
- `pert`, `triangular` under arbitrary arithmetic — closed-form CDFs
  don't survive most ops
- Mixtures of mixed families — fall back to MC

## Payoff for existing examples

### Drake equation

```
R* = 1 to 3 / year      # lognormal
f_p, n_e, f_l, f_i, f_c # all lognormals from `to`
L  = 100 to 10000 year  # lognormal
N  = R* · f_p · ... · L
```

Closed form: each factor is lognormal; the product of lognormals is
lognormal. The result is `lognormal(Σμ_i, √(Σσ_i²))` — computed in microseconds,
exact, no 10 000-sample loop.

### S3 cost

```
size      = (500 to 2000) GB      # lognormal
unit_rate = 0.023 $/GB            # scalar
storage   = size * unit_rate      # scalar × lognormal → lognormal
```

Each term collapses to a lognormal. The final `total = storage + req_cost +
xfer_cost` is a sum of three lognormals — *not* closed form, but each term
is exact and the user can read the per-term variance honestly.

### `chance(total < budget)`

If `total` is a single known distribution (e.g. a closed-form normal sum),
this becomes one CDF evaluation. Today: 10 000-element mean of a 0/1 mask.

## Risks and rollback

- **Silent precision loss**: closed-form `lognormal` mean is
  `exp(μ + σ²/2)`, which can overflow at extreme σ. Mitigation: clamp
  the analytical mean to the sample mean when overflow is detected.
- **Behaviour change**: a percentile that's currently `p50 ≈ 5.001` from
  sampling becomes exactly `5.0` analytically. Visible diff in golden
  tests but not in user-facing display (which already rounds).
- **Test churn**: every distribution golden test needs to decide whether
  it asserts against the sample output (current) or the analytical
  output (new). Recommendation: assert both, with the analytical as
  authoritative and the sample as a tolerance check.

## Order of implementation

1. Phase 1 (one-liner per constructor): ~10 LOC.
2. Phase 2 (analytical `p`/`mean`): ~50 LOC, biggest user-visible win.
3. Phase 3 (analytical arithmetic): ~100 LOC, biggest *latency* win.
4. Phase 4 (exact mixtures): ~30 LOC, lowest priority.

Each phase is independently shippable and reversible.