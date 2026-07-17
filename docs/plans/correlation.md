# Plan: correlation block (coupling continuous distributions)

Bind two or more independent distributions with a target correlation, while
preserving each one's marginal distribution exactly.

Design principle: **explicit over implicit** — the coupling is a visible block
that *defines and couples in one place*, never a mutating statement that rewrites
existing variables.

## The one idea

The engine already has **correlation-by-reuse**: shared sample arrays stay
correlated (`x * x` reuses draws; `closed-form.ts:24`), and the sensitivity view
already *measures* rank-correlation between inputs. The missing piece is the
inverse — *imposing* a target correlation on independently-drawn arrays.

We do it with **Iman–Conover rank reordering**: draw each marginal
independently, then reorder the samples jointly so their rank correlation matches
the target matrix. Reordering never touches the values themselves, so every
marginal is preserved *exactly*; only the pairing across arrays changes. The
reordered arrays then flow through correlation-by-reuse — any later
`traffic * conversion` is automatically correlated.

## Syntax — the `correlate` block

The block **defines** its members, so a correlated variable never exists in an
uncorrelated form that a later line could accidentally pick up. That invariant is
the whole reason to prefer it over a mutating `bind()`.

### Two-variable

```
correlate:
  traffic    = pert(10k, 50k, 100k) req
  conversion = normal(2%, 0.5%)
  cor(traffic, conversion) = 0.6
```

### N-variable — pairwise, sparse

```
correlate:
  traffic    = pert(10k, 50k, 100k) req
  conversion = normal(2%, 0.5%)
  latency    = lognormal(median = 200ms, gsd = 1.5)

  cor(traffic, conversion) = 0.6
  cor(traffic, latency)    = -0.3
  # conversion ↔ latency unspecified → 0
```

Pairwise `cor(a, b) = r` beats a literal matrix: explicit about *which* pairs are
coupled, unspecified pairs default to 0, and no way to typo an asymmetric or
wrong-sized matrix. The engine assembles the full matrix from the pairs.

## Rules — all explicit, all fail loud

- **Members must be sample-based.** A deterministic scalar has no draws to
  reorder → error naming the offending variable.
- **Members must be defined *inside* the block.** Referencing an
  outside-declared variable is rejected — this preserves the "no uncorrelated
  version leaks" invariant. One correlated group = one block.
- **`cor(a, b) = r` is legal only inside `correlate`.** A bare `cor(...)`
  elsewhere is meaningless and is a parse error.
- **`|r| < 1` strictly**, and the assembled matrix must be **positive
  definite** (Cholesky requires it; a matrix containing `r = ±1` is singular).
  `r = ±1` is a hard error whose message suggests expressing perfect coupling
  as a formula instead (`b = -a`, `b = 2 * a`) — that is both exact and more
  explicit than a degenerate correlation. An impossible joint (e.g. three
  strong correlations that can't coexist) is likewise a hard error showing the
  offending matrix — no silent nearest-PSD projection.
- **Marginals preserved exactly** — `mean`, distribution shape, quantiles of
  each member are untouched; only cross-array pairing changes.
- **`r` is rank (Spearman) correlation** — what Iman–Conover induces and what
  the engine's sensitivity view already measures. Documented as such; we do not
  promise exact Pearson after nonlinear marginals.

## Scoping

Members **leak to the sheet** (else they'd be useless downstream). The block is a
*grouping-and-coupling* construct, not a new lexical scope. Members are ordinary
top-level variables whose sample arrays happen to be jointly reordered.

## Mechanics — Iman–Conover

1. Draw each member's N samples independently (existing samplers, `mc.ts`).
2. Build the target correlation matrix `C` from the `cor(...)` pairs (diagonal 1,
   unspecified off-diagonal 0). Validate positive definite (Cholesky itself is
   the check — a failed factorization is the error signal).
3. Cholesky-factor `C = L Lᵀ`.
4. Form a reference score matrix from van der Waerden scores (rank-based normal
   scores), decorrelate it, apply `L` to induce `C`.
5. **Reorder** each member's samples to match the rank ordering of the
   corresponding correlated reference column. Values are unchanged — only their
   positions in the array move.
6. Store the reordered arrays back as the members' values.

Rank-based, so it works for any marginal (pert, lognormal, poisson, …) and holds
the target correlation approximately with no distributional assumptions.

## Relationship to scenarios

The scenario table (`scenarios.md`) expresses *discrete* labelled correlated
cases (high `cost` in the `low` column). `correlate` handles *continuous*
distribution coupling. Different mechanisms, complementary.

## Open questions

1. Block delimiter — indentation (as shown, shared with `scenario`) vs `{ }` /
   `end`. Same parser decision across both blocks.
2. Whether a member may itself be a scenario-valued (multi-axis) distribution —
   leaning: v1 requires plain sample-based members, no axes.
3. Best-effort Pearson mode if a user explicitly asks — deferred.

## Non-goals (first build)

- Mutating `bind(a, b, r=…)` statement (rejected — implicit/order-dependent).
- Exact-Pearson guarantees.
- Correlating deterministic values or across-sheet references.
