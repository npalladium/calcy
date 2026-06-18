import { Engine, type EngineOptions, type LineResult } from '../src/lib/engine';
import { type EvalCtx, evalNode } from '../src/lib/engine/eval';
import { type DistFns, makeGaussian, makeRng } from '../src/lib/engine/mc';
import { type Node, parseLine } from '../src/lib/engine/parse';
import { buildUnitTable } from '../src/lib/engine/units';
import type { Value } from '../src/lib/engine/value';

// Small sample count keeps the suite fast; statistical tests opt into a larger
// N explicitly. Fixed seed makes every run deterministic (FR6.2). Scientific
// number format keeps display values machine-parseable (`Number("3.6e6")`),
// which the numeric-correctness assertions rely on; format styling itself is
// covered separately in format.test.ts.
export const FAST: Partial<EngineOptions> = { N: 2000, seed: 12345, numberFormat: 'scientific' };

export function makeEngine(
	opts: Partial<EngineOptions> = {},
	customUnits: Record<string, string> = {}
): Engine {
	return new Engine({ ...FAST, ...opts }, customUnits);
}

export function lines(text: string, opts: Partial<EngineOptions> = {}): LineResult[] {
	return makeEngine(opts).evalSheet(text).lines;
}

export function values(text: string, opts: Partial<EngineOptions> = {}): LineResult[] {
	return lines(text, opts).filter((l) => l.kind === 'value');
}

export function one(text: string, opts: Partial<EngineOptions> = {}): LineResult {
	return values(text, opts)[0];
}

// Numeric value of a deterministic single-line result.
export function num(text: string, opts: Partial<EngineOptions> = {}): number {
	return Number(one(text, opts).display?.value);
}

export function text(t: string, opts: Partial<EngineOptions> = {}): string | undefined {
	return one(t, opts).display?.text;
}

// ---------------------------------------------------------------------------
// Direct-evaluator harness. The public `Engine` is the right surface for most
// behaviour, but the soundness/differential suites need the raw `Value` out of
// `evalNode` (its `dim`, its scalar-vs-samples shape, its `meta`) without the
// formatting pipeline collapsing it into display strings. These helpers build a
// minimal `EvalCtx` and expose `parse`/`evalSrc` against the default catalogue.

const UNITS = buildUnitTable();

// A DistFns seeded for determinism. Single source of truth for the seed/N used
// by every test that draws samples directly (mc.test.ts predates this and rolls
// its own; new files import this so "which seed?" is never ambiguous).
export function seededFns(N: number, seed: number, level = 0.9): DistFns {
	const rng = makeRng(seed);
	return { N, gaussian: makeGaussian(rng), uniform: rng, level };
}

export function makeCtx(fns: DistFns, env: Map<string, Value> = new Map()): EvalCtx {
	return { env, units: UNITS, fns, above: [], bridges: new Map() };
}

// Parse a single expression line against the default catalogue, returning its
// AST. Throws on a parse error (so error-path tests can assert on the throw).
export function parse(src: string): Node {
	const line = parseLine(src, { isUnit: (n) => UNITS.has(n) });
	if (line.type !== 'expr' && line.type !== 'assign')
		throw new Error(`expected an expression line, got '${line.type}'`);
	return line.expr;
}

// Parse + evaluate a single expression to its raw `Value`. Used where the test
// asserts on `dim` / `scalar` / `samples` / `meta` directly.
export function evalSrc(src: string, fns: DistFns = seededFns(2000, 12345)): Value {
	return evalNode(parse(src), makeCtx(fns));
}

// ---- statistics on a raw sample array (test-side ground truth) ----

export function sampleMean(xs: Float64Array): number {
	let s = 0;
	for (let i = 0; i < xs.length; i++) s += xs[i];
	return s / xs.length;
}

export function sampleSd(xs: Float64Array): number {
	const m = sampleMean(xs);
	let v = 0;
	for (let i = 0; i < xs.length; i++) v += (xs[i] - m) ** 2;
	return Math.sqrt(v / xs.length);
}

// Kolmogorov–Smirnov statistic D = sup|F_n(x) − F(x)| between an empirical
// sample and a reference CDF. The one-sample two-sided KS test: reject H₀ (the
// sample is drawn from F) when D exceeds the critical value for the sample size
// and significance level α. For large n the critical value is c(α)/√n, with
// c(0.01) ≈ 1.628, c(0.001) ≈ 1.949.
export function ksStatistic(samples: Float64Array, cdf: (x: number) => number): number {
	const sorted = Float64Array.from(samples).sort();
	const n = sorted.length;
	let d = 0;
	for (let i = 0; i < n; i++) {
		const f = cdf(sorted[i]);
		// Both the below-step and above-step gaps, per the standard formulation.
		d = Math.max(d, Math.abs(f - i / n), Math.abs((i + 1) / n - f));
	}
	return d;
}

// Critical KS value at significance α for sample size n (asymptotic c(α)/√n).
const KS_C: Record<string, number> = { '0.05': 1.358, '0.01': 1.628, '0.001': 1.949 };
export function ksCritical(n: number, alpha: 0.05 | 0.01 | 0.001 = 0.001): number {
	return KS_C[String(alpha)] / Math.sqrt(n);
}

// Run a sampler over K seeds and report how many seeds produce a KS statistic
// within the critical bound. Lets a test bound both type-I error (a correct
// sampler should pass on almost every seed) and type-II error (a broken sampler
// fails on most seeds) instead of pinning a single lucky seed.
export function ksPassRate(
	draw: (fns: DistFns) => Float64Array,
	cdf: (x: number) => number,
	{ N = 20000, seeds = 8, alpha = 0.001 as 0.05 | 0.01 | 0.001 } = {}
): { passes: number; total: number; worst: number; crit: number } {
	const crit = ksCritical(N, alpha);
	let passes = 0;
	let worst = 0;
	for (let s = 0; s < seeds; s++) {
		const d = ksStatistic(draw(seededFns(N, 1000 + s * 7919)), cdf);
		if (d <= crit) passes++;
		worst = Math.max(worst, d);
	}
	return { passes, total: seeds, worst, crit };
}
