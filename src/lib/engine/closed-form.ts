// Closed-form operations on distributions that carry a parametric identity
// (ValueMeta). The engine still falls back to Monte Carlo when a distribution
// has no `meta` or when an operation can't preserve a closed form — this
// module just short-circuits the cases that have one.
//
// Phases (see docs/closed-form-distributions.md):
//   Phase 2 — analytical `mean(d)` and `p(d, q)` for known families
//   Phase 3 — analytical arithmetic on normal / lognormal / scalar × distribution
//
// Every function here is total: if it can't reduce to a closed form, it
// returns `null` and the caller falls back to the sample path.

import type { DistFns } from './mc';
import { normalInverseCdf } from './stats-adapter';
import type { Dimension, Value, ValueMeta } from './value';

// Draw N samples from a closed-form distribution. Used to materialise a
// `Value` that came out of `closedFormBinop` so that the display pipeline
// (sparkline, p5/p95, sd) has data to render. The meta rides alongside the
// samples, so analytical consumers (mean, p) read the exact value.
//
// When the closed-form op has access to the input sample arrays, we
// *derive* the output samples from the inputs elementwise — not from a
// fresh draw. This preserves correlation-by-reuse: `x * x` shares its
// sample array with `x`, so `x - x ≡ 0` and `x + x ≡ 2x` keep working,
// and sensitivity still detects the rank-correlation between `a` and
// `a * b`.
export function sampleFromMeta(
	v: Value & { meta: ValueMeta },
	ctx: { fns: DistFns },
	fromA?: Value,
	fromB?: Value
): Value {
	const N = ctx.fns.N;
	const out = new Float64Array(N);

	// Distribution × distribution: combine the input samples directly. The
	// closed-form dispatcher only emits normal (additive) and lognormal
	// (multiplicative) results, so the op is implicit in the meta kind.
	if (fromA?.samples && fromB?.samples) {
		if (v.meta.kind === 'lognormal') {
			for (let i = 0; i < N; i++) out[i] = fromA.samples[i] * fromB.samples[i];
			return { dim: v.dim, samples: out, meta: v.meta };
		}
		if (v.meta.kind === 'normal') {
			for (let i = 0; i < N; i++) out[i] = fromA.samples[i] + fromB.samples[i];
			return { dim: v.dim, samples: out, meta: v.meta };
		}
	}

	// Scalar × distribution: keep the distribution's samples, apply the
	// scalar elementwise.
	if (fromA?.samples && fromB?.scalar != null) {
		const k = fromB.scalar;
		if (v.meta.kind === 'lognormal' && k > 0) {
			for (let i = 0; i < N; i++) out[i] = fromA.samples[i] * k;
			return { dim: v.dim, samples: out, meta: v.meta };
		}
		if (v.meta.kind === 'normal') {
			for (let i = 0; i < N; i++) out[i] = fromA.samples[i] * k;
			return { dim: v.dim, samples: out, meta: v.meta };
		}
	}
	if (fromB?.samples && fromA?.scalar != null) {
		const k = fromA.scalar;
		if (v.meta.kind === 'lognormal' && k > 0) {
			for (let i = 0; i < N; i++) out[i] = k * fromB.samples[i];
			return { dim: v.dim, samples: out, meta: v.meta };
		}
		if (v.meta.kind === 'normal') {
			for (let i = 0; i < N; i++) out[i] = k * fromB.samples[i];
			return { dim: v.dim, samples: out, meta: v.meta };
		}
	}

	// Scalar +/− distribution: shift the samples by the scalar.
	if (fromA?.samples && fromB?.scalar != null && v.meta.kind === 'normal') {
		for (let i = 0; i < N; i++) out[i] = fromA.samples[i] + fromB.scalar;
		return { dim: v.dim, samples: out, meta: v.meta };
	}

	// Fallback: fresh draws from the closed-form distribution.
	for (let i = 0; i < N; i++) {
		switch (v.meta.kind) {
			case 'normal':
				out[i] = v.meta.mean + v.meta.sd * ctx.fns.gaussian();
				break;
			case 'lognormal':
				out[i] = Math.exp(v.meta.mu + v.meta.sigma * ctx.fns.gaussian());
				break;
			default:
				throw new Error(`sampleFromMeta: unhandled meta kind ${(v.meta as ValueMeta).kind}`);
		}
	}
	return { dim: v.dim, samples: out, meta: v.meta };
}

// --- analytical mean ---------------------------------------------------------
//
// Each entry returns the *population* mean of the distribution, exact (no
// sampling noise). Used by `mean(d)` when a distribution has a meta identity.

export function analyticalMean(v: Value): number | null {
	switch (v.meta?.kind) {
		case 'normal':
			return v.meta.mean;
		case 'lognormal':
			// E[X] = exp(μ + σ²/2). May overflow for large σ; let the caller
			// fall back to sample-mean if so (handled by `Number.isFinite`).
			return Math.exp(v.meta.mu + (v.meta.sigma * v.meta.sigma) / 2);
		case 'uniform':
			return (v.meta.lo + v.meta.hi) / 2;
		case 'exponential':
			return v.meta.mean;
		case 'poisson':
			return v.meta.lambda;
		case 'beta':
			return v.meta.a / (v.meta.a + v.meta.b);
		case 'triangular':
			return (v.meta.lo + v.meta.mode + v.meta.hi) / 3;
		case 'pert': {
			// Beta-PERT mean over [lo, hi] = (lo + 4m + hi) / 6.
			// Recover m from α: α = 1 + 4(m − lo)/(hi − lo).
			const span = v.meta.hi - v.meta.lo;
			const m = v.meta.lo + ((v.meta.alpha - 1) * span) / 4;
			return (v.meta.lo + 4 * m + v.meta.hi) / 6;
		}
		default:
			return null;
	}
}

// --- analytical percentile (inverse CDF) ------------------------------------
//
// `p(d, q)` for known families. Returns null for distributions where the
// inverse CDF isn't a simple closed form (pert, triangular — could be added
// later but the inverse CDF is messy).

export function analyticalPercentile(v: Value, q: number): number | null {
	if (!(q >= 0 && q <= 1)) {
		throw new Error(`p: percentile q must be between 0 and 1, got ${q}`);
	}
	if (q === 0) {
		switch (v.meta?.kind) {
			case 'normal':
				return -Infinity;
			case 'lognormal':
				return 0;
			case 'uniform':
				return v.meta.lo;
			case 'exponential':
				return 0;
			case 'poisson':
				return 0;
			case 'beta':
				return 0;
			default:
				return null;
		}
	}
	if (q === 1) {
		switch (v.meta?.kind) {
			case 'normal':
				return Infinity;
			case 'lognormal':
				return Infinity;
			case 'uniform':
				return v.meta.hi;
			case 'exponential':
				return Infinity;
			case 'poisson':
				return Infinity;
			case 'beta':
				return 1;
			default:
				return null;
		}
	}
	const z = normalInverseCdf(q);
	switch (v.meta?.kind) {
		case 'normal':
			return v.meta.mean + z * v.meta.sd;
		case 'lognormal':
			return Math.exp(v.meta.mu + z * v.meta.sigma);
		case 'uniform':
			return v.meta.lo + (v.meta.hi - v.meta.lo) * q;
		case 'exponential':
			// Q(q) = -mean · ln(1 − q)
			return -v.meta.mean * Math.log(1 - q);
		case 'beta':
			// No closed form without the regularised incomplete beta function.
			// simple-statistics doesn't ship one; we fall back to samples.
			return null;
		default:
			// poisson, triangular, pert — no closed-form inverse CDF; the caller
			// reads the empirical quantile from the sample array.
			return null;
	}
}

// --- analytical arithmetic (Phase 3) ----------------------------------------
//
// Each entry takes two `Value`s plus optional scalar arithmetic context
// (a scalar multiplier or addend) and tries to produce a new `Value` whose
// `meta` captures the closed-form result. Returns null when no closed form
// applies — the engine then samples elementwise as today.

// Normal ⊕ Normal combinations that preserve the family.
// Independent normals X ~ N(μ₁,σ₁) and Y ~ N(μ₂,σ₂):
//   X + Y  ~ N(μ₁+μ₂, √(σ₁²+σ₂²))
//   X - Y  ~ N(μ₁-μ₂, √(σ₁²+σ₂²))
//   X · k  ~ N(k·μ₁, |k|·σ₁)        (k scalar)
//   X + k  ~ N(μ₁+k, σ₁)             (k scalar)
//   X - k  ~ N(μ₁-k, σ₁)
//   X · Y  — not normal (closed form is messier); fall back to MC
export function normalOp(op: '+' | '-' | '*' | '/', a: Value, b: Value): Value | null {
	const ma = a.meta?.kind === 'normal' ? a.meta : null;
	const mb = b.meta?.kind === 'normal' ? b.meta : null;

	// X + Y / X - Y where both are normal: closed form (X - Y).
	if (ma && mb && (op === '+' || op === '-')) {
		const sign = op === '+' ? 1 : -1;
		const newMean = ma.mean + sign * mb.mean;
		const newSd = Math.sqrt(ma.sd * ma.sd + mb.sd * mb.sd);
		const dim: Dimension = op === '+' ? a.dim : { ...a.dim };
		// X - Y has the *same* dim as X (Y is subtracted, dim cancels).
		return { dim, meta: { kind: 'normal', mean: newMean, sd: newSd } };
	}

	// X * k or X / k where one side is a scalar.
	if (ma && b.scalar != null && (op === '*' || op === '/')) {
		const k = op === '*' ? b.scalar : 1 / b.scalar;
		const dim: Dimension = { ...a.dim };
		// Multiplication/division by a scalar preserves units-of-1; dim stays.
		return { dim, meta: { kind: 'normal', mean: ma.mean * k, sd: ma.sd * Math.abs(k) } };
	}
	if (mb && a.scalar != null && (op === '*' || op === '/')) {
		const k = op === '*' ? a.scalar : a.scalar; // scalar / normal isn't a normal
		if (op === '/') return null;
		return { dim: b.dim, meta: { kind: 'normal', mean: mb.mean * k, sd: mb.sd * Math.abs(k) } };
	}

	// X + k / X - k where k is a scalar in the same units as X.
	if (ma && b.scalar != null && (op === '+' || op === '-')) {
		const sign = op === '+' ? 1 : -1;
		return {
			dim: a.dim,
			meta: { kind: 'normal', mean: ma.mean + sign * b.scalar, sd: ma.sd }
		};
	}

	return null;
}

// Lognormal combinations that preserve the family.
// Independent lognormals X = exp(A), Y = exp(B) with A, B normal:
//   X · Y  ~ Lognormal(μ₁+μ₂, √(σ₁²+σ₂²))   (the operation that matters)
//   X / Y  ~ Lognormal(μ₁-μ₂, √(σ₁²+σ₂²))
//   X · k  ~ Lognormal(μ + ln(k), σ)          (k > 0)
//   X + k  — not lognormal; fall back to MC
export function lognormalOp(op: '+' | '-' | '*' | '/', a: Value, b: Value): Value | null {
	const ma = a.meta?.kind === 'lognormal' ? a.meta : null;
	const mb = b.meta?.kind === 'lognormal' ? b.meta : null;

	if (ma && mb && (op === '*' || op === '/')) {
		const sign = op === '*' ? 1 : -1;
		const newMu = ma.mu + sign * mb.mu;
		const newSigma = Math.sqrt(ma.sigma * ma.sigma + mb.sigma * mb.sigma);
		return {
			dim: a.dim,
			meta: { kind: 'lognormal', mu: newMu, sigma: newSigma }
		};
	}

	if (ma && b.scalar != null && (op === '*' || op === '/') && b.scalar > 0) {
		const k = op === '*' ? Math.log(b.scalar) : -Math.log(b.scalar);
		return {
			dim: a.dim,
			meta: { kind: 'lognormal', mu: ma.mu + k, sigma: ma.sigma }
		};
	}
	if (mb && a.scalar != null && op === '*' && a.scalar > 0) {
		return {
			dim: b.dim,
			meta: { kind: 'lognormal', mu: mb.mu + Math.log(a.scalar), sigma: mb.sigma }
		};
	}

	return null;
}

// Top-level dispatcher for a binary op. Returns a closed-form `Value` if one
// exists, otherwise null. The dim is the same as the engine's `binop` would
// compute; callers can re-derive if needed.
export function closedFormBinop(
	op: '+' | '-' | '*' | '/' | '^' | '<' | '>' | '<=' | '>=',
	a: Value,
	b: Value,
	outDim: Dimension
): Value | null {
	if (op !== '+' && op !== '-' && op !== '*' && op !== '/') return null;
	const n = normalOp(op, a, b);
	if (n) return { ...n, dim: outDim };
	const l = lognormalOp(op, a, b);
	if (l) return { ...l, dim: outDim };
	return null;
}
