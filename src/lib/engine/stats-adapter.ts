// Thin wrapper around `simple-statistics` for the few functions we want that
// aren't already in mc.ts: real third-moment skewness, the standard-normal CDF,
// and the probit (inverse standard-normal CDF).
//
// Why a wrapper instead of importing direct:
//
// - calcy stores samples as `Float64Array`; simple-statistics expects
//   `Array<number>`. The wrapper allocates the conversion once per call rather
//   than spreading the cost across call sites.
// - Centralising the import also gives us one place to swap to stdlib's
//   higher-precision inverse-CDF later, or to inject a test double.
//
// The closed-form functions used by the analytical-arithmetic layer
// (`normalInverseCdf`, `normalCdf`) live here too so the engine has a single
// place to look for both statistical reductions and exact probability
// primitives.

import {
	cumulativeStdNormalProbability as ssCumulativeStdNormal,
	probit as ssProbit,
	sampleSkewness as ssSampleSkewness
} from 'simple-statistics';

// Convert our sample storage into a plain array. Allocates once per call;
// for N = 10 000 the cost is dwarfed by the stats work that follows.
const toArr = (xs: Float64Array | number[]): number[] =>
	xs instanceof Float64Array ? Array.from(xs) : xs;

// Adjusted Fisher–Pearson standardised moment coefficient G₁ (matches Excel,
// SAS, SPSS, Minitab). Returns 0 for inputs too short or where the variance is
// ~0, so callers can safely pipe into `skewed` checks without a guard.
export function sampleSkewness(xs: Float64Array | number[]): number {
	const a = toArr(xs);
	if (a.length < 3) return 0;
	const v = ssSampleSkewness(a);
	return Number.isFinite(v) ? v : 0;
}

// Φ(z) — standard-normal CDF. Useful for `chance(X < k)` when X has a closed
// form (a future Phase 3 optimisation). Currently used in tests for ground-
// truth comparisons.
export function normalCdf(z: number): number {
	return ssCumulativeStdNormal(z);
}

// Φ⁻¹(p) — probit. Tighter than A&S 26.2.23 (Acklam-style accuracy, ~1e-9),
// and matches `scipy.stats.norm.ppf`. Used by `p()` when a distribution has a
// parametric identity, so the percentile of a known normal is exact.
export function normalInverseCdf(p: number): number {
	if (!(p > 0 && p < 1)) {
		if (p === 0) return -Infinity;
		if (p === 1) return Infinity;
		throw new Error(`probit: p must be in (0, 1), got ${p}`);
	}
	return ssProbit(p);
}
