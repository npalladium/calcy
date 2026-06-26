// Monte Carlo layer: seeded RNG, distribution constructors, summaries.
// All distributions are N samples; arithmetic is elementwise (in eval.ts).

import { sampleSkewness } from './stats-adapter';
import type { Value } from './value';

// Two-sided quantile for a confidence level in (0, 1). For a CI that captures
// `level` of the mass, each tail holds (1 − level) / 2, and this is the z-score
// at that tail. Examples: 0.90 → 1.6449, 0.95 → 1.9600, 0.99 → 2.5758.
export function zForLevel(level: number): number {
	if (!(level > 0 && level < 1))
		throw new Error(`confidence level must be in (0, 1), got ${level}`);
	// Abramowitz & Stegun 26.2.23 — direct rational approximation of Φ⁻¹(p).
	// Accurate to ~4.5e-4 over (0, 1), which is far tighter than the sample
	// noise the z-score feeds into (CI half-width on N = 10 000 is already
	// ~0.5%). Branch-free, no lookup. A future revision can swap in stdlib's
	// inverse-normal if sub-1e-6 accuracy is ever needed.
	const p = 1 - (1 - level) / 2;
	const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
	const c0 = 2.515517;
	const c1 = 0.802853;
	const c2 = 0.010328;
	const d1 = 1.432788;
	const d2 = 0.189269;
	const d3 = 0.001308;
	return (
		(p < 0.5 ? -1 : 1) *
		(t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t))
	);
}

// Back-compat: 0.95 quantile of the standard normal, the half-width of a 90% CI.
export const Z90 = zForLevel(0.9);

// mulberry32: tiny, fast, seedable PRNG. Deterministic per seed.
export function makeRng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Standard normal via Box–Muller, fed by a uniform RNG.
export function makeGaussian(rng: () => number): () => number {
	let spare: number | null = null;
	return () => {
		if (spare != null) {
			const s = spare;
			spare = null;
			return s;
		}
		let u = 0;
		let v = 0;
		let s = 0;
		do {
			u = rng() * 2 - 1;
			v = rng() * 2 - 1;
			s = u * u + v * v;
		} while (s >= 1 || s === 0);
		const mul = Math.sqrt((-2 * Math.log(s)) / s);
		spare = v * mul;
		return u * mul;
	};
}

export interface DistFns {
	N: number;
	gaussian: () => number;
	uniform: () => number;
	// Confidence level used by `ciSamples`/`about`-style constructors to map a
	// symmetric interval [lo, hi] to a normal/lognormal. Default 0.90. Callers
	// (or a per-sheet `confidence` setting) can override to use 95%, 68% (≈ 1σ),
	// etc. — the displayed p5/p95/p25/p75 percentiles stay fixed regardless.
	level: number;
}

// ---- distribution constructors (all return base-unit sample arrays) ----

// CI lo..hi at fns.level. Both positive -> lognormal; spanning/≤0 -> normal.
export function ciSamples(lo: number, hi: number, fns: DistFns): Float64Array {
	const out = new Float64Array(fns.N);
	const z = zForLevel(fns.level);
	if (lo > 0 && hi > 0) {
		const mu = (Math.log(lo) + Math.log(hi)) / 2;
		const sigma = (Math.log(hi) - Math.log(lo)) / (2 * z);
		for (let i = 0; i < fns.N; i++) out[i] = Math.exp(mu + sigma * fns.gaussian());
	} else {
		const mean = (lo + hi) / 2;
		const sd = (hi - lo) / (2 * z);
		for (let i = 0; i < fns.N; i++) out[i] = mean + sd * fns.gaussian();
	}
	return out;
}

export function normalSamples(mean: number, sd: number, fns: DistFns): Float64Array {
	const out = new Float64Array(fns.N);
	for (let i = 0; i < fns.N; i++) out[i] = mean + sd * fns.gaussian();
	return out;
}

// lognormal parameterised by its [lower, upper] quantiles at fns.level (both > 0).
export function lognormalSamples(pLower: number, pUpper: number, fns: DistFns): Float64Array {
	if (pLower <= 0 || pUpper <= 0) throw new Error('lognormal requires positive bounds');
	return ciSamples(pLower, pUpper, fns);
}

export function uniformSamples(a: number, b: number, fns: DistFns): Float64Array {
	const out = new Float64Array(fns.N);
	const span = b - a;
	for (let i = 0; i < fns.N; i++) out[i] = a + fns.uniform() * span;
	return out;
}

// beta(a,b) via two gamma draws (Marsaglia–Tsang gamma).
export function betaSamples(a: number, b: number, fns: DistFns): Float64Array {
	const out = new Float64Array(fns.N);
	for (let i = 0; i < fns.N; i++) {
		const x = gammaDraw(a, fns);
		const y = gammaDraw(b, fns);
		out[i] = x / (x + y);
	}
	return out;
}

// Beta-PERT from a three-point estimate: optimistic `a`, most-likely `m`,
// pessimistic `b` (a ≤ m ≤ b). Standard PERT uses λ=4, giving shape params
// α = 1 + 4(m−a)/(b−a), β = 1 + 4(b−m)/(b−a); a Beta(α,β) draw is scaled to
// [a, b]. Mean = (a + 4m + b)/6, mode at m.
export function pertSamples(a: number, m: number, b: number, fns: DistFns): Float64Array {
	if (!(a < b)) throw new Error('pert requires lo < hi');
	if (m < a || m > b) throw new Error('pert requires lo ≤ most-likely ≤ hi');
	const range = b - a;
	const alpha = 1 + (4 * (m - a)) / range;
	const beta = 1 + (4 * (b - m)) / range;
	const out = new Float64Array(fns.N);
	for (let i = 0; i < fns.N; i++) {
		const x = gammaDraw(alpha, fns);
		const y = gammaDraw(beta, fns);
		out[i] = a + (x / (x + y)) * range;
	}
	return out;
}

// Exponential by mean (mean > 0): wait time between events. Inverse-CDF, so
// every draw is non-negative; right-skewed with CV = 1.
export function exponentialSamples(mean: number, fns: DistFns): Float64Array {
	if (!(mean > 0)) throw new Error('exponential requires a positive mean');
	const out = new Float64Array(fns.N);
	// uniform() is in [0,1); 1 - u is in (0,1] so log is finite.
	for (let i = 0; i < fns.N; i++) out[i] = -mean * Math.log(1 - fns.uniform());
	return out;
}

// Triangular three-point estimate: lo ≤ mode ≤ hi, lo < hi. Inverse-CDF; a
// flatter alternative to PERT for the same min/most-likely/max inputs.
export function triangularSamples(
	lo: number,
	mode: number,
	hi: number,
	fns: DistFns
): Float64Array {
	if (!(lo < hi)) throw new Error('triangular requires lo < hi');
	if (mode < lo || mode > hi) throw new Error('triangular requires lo ≤ mode ≤ hi');
	const span = hi - lo;
	const c = (mode - lo) / span; // CDF value at the mode
	const out = new Float64Array(fns.N);
	for (let i = 0; i < fns.N; i++) {
		const u = fns.uniform();
		out[i] =
			u < c ? lo + Math.sqrt(u * span * (mode - lo)) : hi - Math.sqrt((1 - u) * span * (hi - mode));
	}
	return out;
}

// Poisson by expected count λ ≥ 0 — number of events in a window. Knuth's
// product method for small λ (exact); a rounded Normal(λ, √λ) for large λ
// (skew 1/√λ is small, and it keeps sampling O(1) instead of O(λ)). Both yield
// whole counts; adequate for estimation, where everything is already sampled.
export function poissonSamples(lambda: number, fns: DistFns): Float64Array {
	if (lambda < 0) throw new Error('poisson requires a non-negative mean');
	const out = new Float64Array(fns.N);
	if (lambda < 30) {
		const L = Math.exp(-lambda);
		for (let i = 0; i < fns.N; i++) {
			let k = 0;
			let p = 1;
			do {
				k++;
				p *= fns.uniform();
			} while (p > L);
			out[i] = k - 1;
		}
	} else {
		const sd = Math.sqrt(lambda);
		for (let i = 0; i < fns.N; i++) {
			const x = Math.round(lambda + sd * fns.gaussian());
			out[i] = x < 0 ? 0 : x;
		}
	}
	return out;
}

function gammaDraw(k: number, fns: DistFns): number {
	if (k < 1) {
		const u = fns.uniform();
		return gammaDraw(1 + k, fns) * u ** (1 / k);
	}
	const d = k - 1 / 3;
	const c = 1 / Math.sqrt(9 * d);
	for (;;) {
		let x: number;
		let v: number;
		do {
			x = fns.gaussian();
			v = 1 + c * x;
		} while (v <= 0);
		v = v * v * v;
		const u = fns.uniform();
		if (u < 1 - 0.0331 * x ** 4) return d * v;
		if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
	}
}

// Mixture: equal-weight (or supplied weights) draw from component sample arrays.
export function mixtureSamples(
	components: Float64Array[],
	fns: DistFns,
	weights?: number[]
): Float64Array {
	const n = components.length;
	const supplied = weights ?? new Array(n).fill(1);
	const sum = supplied.reduce((a, b) => a + b, 0);
	// Degenerate weights (all zero, or none supplied summing to 0) would make
	// `wi / total` NaN and silently collapse the mixture onto one component.
	// Fall back to equal weights so the result stays a real mixture.
	const w = sum > 0 ? supplied : new Array(n).fill(1);
	const total = sum > 0 ? sum : n;
	const cum: number[] = [];
	let acc = 0;
	for (const wi of w) {
		acc += wi / total;
		cum.push(acc);
	}
	const out = new Float64Array(fns.N);
	for (let i = 0; i < fns.N; i++) {
		const r = fns.uniform();
		let c = 0;
		while (c < n - 1 && r > cum[c]) c++;
		out[i] = components[c][i];
	}
	return out;
}

// ---- summaries ----

export interface PointSummary {
	kind: 'point';
	value: number;
	dim: Value['dim'];
}

export interface DistSummary {
	kind: 'dist';
	dim: Value['dim'];
	mean: number;
	sd: number;
	min: number;
	max: number;
	p5: number;
	p25: number;
	p50: number;
	p75: number;
	p95: number;
	// The active confidence band: empirical quantiles at [(1−level)/2, (1+level)/2]
	// for the sheet's confidence level. This is the interval the result actually
	// displays, so it matches what the user typed (at level 0.9, ciLow/ciHigh ===
	// p5/p95). The fixed p5/p25/p50/p75/p95 above stay literal for the inspector.
	ciLow: number;
	ciHigh: number;
	ciLevel: number;
	// Pearson-style skew proxy: (mean − median) / sd. Positive = right-skewed
	// (long upper tail), negative = left-skewed. Robust enough to flag tails
	// without needing a third central moment, and stays finite when sd is
	// tiny (we return 0 in that case). |skew| > ~0.3 typically means the
	// mean is a misleading central-tendency summary.
	skew: number;
	hist: number[]; // bar heights (counts), see histogram()
	histMin: number;
	histMax: number;
}

export type Summary = PointSummary | DistSummary;

function quantileSorted(sorted: Float64Array, p: number): number {
	if (sorted.length === 1) return sorted[0];
	const idx = p * (sorted.length - 1);
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	if (lo === hi) return sorted[lo];
	return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function histogram(
	sorted: Float64Array,
	bins = 30
): { hist: number[]; min: number; max: number } {
	const min = sorted[0];
	const max = sorted[sorted.length - 1];
	const hist = new Array(bins).fill(0);
	if (max === min) {
		hist[Math.floor(bins / 2)] = sorted.length;
		return { hist, min, max };
	}
	const width = (max - min) / bins;
	for (let i = 0; i < sorted.length; i++) {
		let b = Math.floor((sorted[i] - min) / width);
		if (b >= bins) b = bins - 1;
		hist[b]++;
	}
	return { hist, min, max };
}

export function summarize(v: Value, level = 0.9): Summary {
	if (v.scalar != null) return { kind: 'point', value: v.scalar, dim: v.dim };
	const samples = v.samples as Float64Array;
	const sorted = Float64Array.from(samples).sort();
	let sum = 0;
	for (let i = 0; i < sorted.length; i++) sum += sorted[i];
	const sampleMean = sum / sorted.length;
	let varSum = 0;
	for (let i = 0; i < sorted.length; i++) varSum += (sorted[i] - sampleMean) ** 2;
	const sampleSd = Math.sqrt(varSum / sorted.length);
	const { hist, min, max } = histogram(sorted);
	// When the distribution carries a parametric identity, override the
	// sample-derived moments with the exact analytical values. The samples
	// stay around for the histogram and the p5/p25/p50/p75/p95 percentiles
	// (the empirical quantiles of the *realised* draws — which is what the
	// user actually sees), but the displayed mean and sd are exact.
	let mean = sampleMean;
	let sd = sampleSd;
	if (v.meta) {
		switch (v.meta.kind) {
			case 'normal':
				mean = v.meta.mean;
				sd = v.meta.sd;
				break;
			case 'lognormal':
				mean = Math.exp(v.meta.mu + (v.meta.sigma * v.meta.sigma) / 2);
				sd = Math.sqrt(
					(Math.exp(v.meta.sigma * v.meta.sigma) - 1) *
						Math.exp(2 * v.meta.mu + v.meta.sigma * v.meta.sigma)
				);
				break;
			case 'uniform':
				mean = (v.meta.lo + v.meta.hi) / 2;
				sd = (v.meta.hi - v.meta.lo) / Math.sqrt(12);
				break;
			case 'exponential':
				mean = v.meta.mean;
				sd = v.meta.mean;
				break;
			case 'poisson':
				mean = v.meta.lambda;
				sd = Math.sqrt(v.meta.lambda);
				break;
			case 'beta':
				mean = v.meta.a / (v.meta.a + v.meta.b);
				{
					const apb = v.meta.a + v.meta.b;
					sd = Math.sqrt((v.meta.a * v.meta.b) / (apb * apb * (apb + 1)));
				}
				break;
			case 'triangular':
				mean = (v.meta.lo + v.meta.mode + v.meta.hi) / 3;
				sd = Math.sqrt(
					(v.meta.lo * v.meta.lo +
						v.meta.mode * v.meta.mode +
						v.meta.hi * v.meta.hi -
						v.meta.lo * v.meta.mode -
						v.meta.lo * v.meta.hi -
						v.meta.mode * v.meta.hi) /
						18
				);
				break;
			case 'pert': {
				const span = v.meta.hi - v.meta.lo;
				const m = v.meta.lo + ((v.meta.alpha - 1) * span) / 4;
				mean = (v.meta.lo + 4 * m + v.meta.hi) / 6;
				const apb = v.meta.alpha + v.meta.beta;
				const mu1 = v.meta.alpha / apb;
				const mu2 = (v.meta.alpha + 1) / (apb + 1);
				// Var of Beta(α,β) on the unit interval is μ₁(μ₂−μ₁); the
				// four-parameter PERT scales it by the span², so sd = span·√(…).
				sd = (v.meta.hi - v.meta.lo) * Math.sqrt(mu1 * (mu2 - mu1));
				break;
			}
		}
	}
	const p50 = quantileSorted(sorted, 0.5);
	// The displayed band tracks the active confidence level so the shown interval
	// matches what the user typed (`a to b` puts a/b at exactly these quantiles).
	const tail = (1 - level) / 2;
	const ciLow = quantileSorted(sorted, tail);
	const ciHigh = quantileSorted(sorted, 1 - tail);
	// Real third-moment skewness via simple-statistics (adjusted Fisher-Pearson
	// G₁, matches Excel / SAS / SPSS / Minitab). Imported through the local
	// stats-adapter so mc.ts has no direct dependency on the library. Falls
	// back to 0 for samples too small or with degenerate variance.
	const skew = sampleSd > 1e-12 ? sampleSkewness(samples) : 0;
	return {
		kind: 'dist',
		dim: v.dim,
		mean,
		sd,
		min,
		max,
		p5: quantileSorted(sorted, 0.05),
		p25: quantileSorted(sorted, 0.25),
		p50,
		p75: quantileSorted(sorted, 0.75),
		p95: quantileSorted(sorted, 0.95),
		ciLow,
		ciHigh,
		ciLevel: level,
		skew,
		hist,
		histMin: min,
		histMax: max
	};
}

// Reducer helpers used by mean()/median()/p() etc.
export function reduceMean(s: Float64Array): number {
	let sum = 0;
	for (let i = 0; i < s.length; i++) sum += s[i];
	return sum / s.length;
}

export function reducePercentile(s: Float64Array, p: number): number {
	const sorted = Float64Array.from(s).sort();
	return quantileSorted(sorted, p);
}

export function reduceSd(s: Float64Array): number {
	const m = reduceMean(s);
	let v = 0;
	for (let i = 0; i < s.length; i++) v += (s[i] - m) ** 2;
	return Math.sqrt(v / s.length);
}
