import { describe, expect, it } from 'vitest';
import {
  betaSamples,
  exponentialSamples,
  mixtureSamples,
  normalSamples,
  poissonSamples,
  triangularSamples,
  uniformSamples
} from '../src/lib/engine/mc';
import { normalCdf } from '../src/lib/engine/stats-adapter';
import { ksPassRate, sampleMean, sampleSd, seededFns } from './helpers';

// Statistical goodness-of-fit for the samplers.
//
// The existing mc.test.ts pins one seed and checks the mean with toBeCloseTo —
// which tests one moment and breaks if the seed changes. This file instead runs
// a two-sided Kolmogorov–Smirnov test of the *whole distribution* against its
// analytical CDF, swept across several seeds. A correct sampler passes the
// α = 0.001 bound on (almost) every seed; a broken one (wrong variance, biased
// tail, off-by-one inverse-CDF) fails on most. Bounding the pass-rate controls
// both false positives (flaky seeds) and false negatives (a bug that only one
// seed happens to mask).
//
// KS needs a closed-form CDF, so the families with elementary CDFs (normal,
// uniform, exponential, triangular) get the full test; the rest (beta k<1,
// poisson, mixture) get targeted moment/shape assertions.

// A correct sampler should clear the α=0.001 bound on every one of K seeds.
// Allow a single miss as slack against the asymptotic critical-value
// approximation; a genuinely broken sampler misses far more than one.
function expectGoodFit(
  draw: (fns: ReturnType<typeof seededFns>) => Float64Array,
  cdf: (x: number) => number
) {
  const { passes, total, worst, crit } = ksPassRate(draw, cdf);
  expect(
    passes,
    `KS fit: ${passes}/${total} seeds within D<${crit.toFixed(4)} (worst D=${worst.toFixed(4)})`
  ).toBeGreaterThanOrEqual(total - 1);
}

describe('KS goodness-of-fit against the analytical CDF', () => {
  it('normal(100, 15) fits Φ', () => {
    expectGoodFit(
      (fns) => normalSamples(100, 15, fns),
      (x) => normalCdf((x - 100) / 15)
    );
  });

  it('uniform(0, 1) fits the uniform CDF', () => {
    expectGoodFit(
      (fns) => uniformSamples(0, 1, fns),
      (x) => Math.min(1, Math.max(0, x))
    );
  });

  it('exponential(mean=5) fits 1 − e^(−x/5)', () => {
    expectGoodFit(
      (fns) => exponentialSamples(5, fns),
      (x) => (x <= 0 ? 0 : 1 - Math.exp(-x / 5))
    );
  });

  it('triangular(2, 3, 8) fits its piecewise CDF', () => {
    const lo = 2;
    const mode = 3;
    const hi = 8;
    const cdf = (x: number) => {
      if (x <= lo) return 0;
      if (x >= hi) return 1;
      if (x <= mode) return ((x - lo) * (x - lo)) / ((hi - lo) * (mode - lo));
      return 1 - ((hi - x) * (hi - x)) / ((hi - lo) * (hi - mode));
    };
    expectGoodFit((fns) => triangularSamples(lo, mode, hi, fns), cdf);
  });
});

describe('targeted shape/moment checks for families without an elementary CDF', () => {
  // beta(0.5, 0.5) is the arcsine distribution: U-shaped, mass piled at 0 and 1.
  // It exercises the gammaDraw k<1 branch (mc.ts:208), untested elsewhere.
  it('beta(0.5, 0.5) is U-shaped (mass at the extremes, thin middle)', () => {
    const xs = betaSamples(0.5, 0.5, seededFns(40000, 42));
    const frac = (pred: (x: number) => boolean) => Array.from(xs).filter(pred).length / xs.length;
    const tails = frac((x) => x < 0.1) + frac((x) => x > 0.9);
    const middle = frac((x) => x > 0.4 && x < 0.6);
    expect(sampleMean(xs)).toBeCloseTo(0.5, 1);
    expect(tails).toBeGreaterThan(0.35); // arcsine: ~0.41
    expect(middle).toBeLessThan(0.2); // arcsine: ~0.13
    expect(tails).toBeGreaterThan(middle);
  });

  it('beta(2, 5) matches its closed-form mean and variance', () => {
    const a = 2;
    const b = 5;
    const xs = betaSamples(a, b, seededFns(40000, 7));
    const mean = a / (a + b);
    const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
    expect(sampleMean(xs)).toBeCloseTo(mean, 2);
    expect(sampleSd(xs)).toBeCloseTo(Math.sqrt(variance), 2);
  });

  // Poisson(8) takes Knuth's exact product method (λ<30); variance must equal λ.
  it('poisson(8) [Knuth branch]: mean ≈ variance ≈ 8, integer support', () => {
    const xs = poissonSamples(8, seededFns(40000, 11));
    expect(sampleMean(xs)).toBeCloseTo(8, 1);
    expect(sampleSd(xs) ** 2).toBeCloseTo(8, 0);
    expect(Array.from(xs).every((x) => Number.isInteger(x) && x >= 0)).toBe(true);
  });

  // Poisson(100) takes the normal-approximation branch (λ≥30); variance ≈ λ too.
  it('poisson(100) [normal branch]: mean and variance ≈ 100', () => {
    const xs = poissonSamples(100, seededFns(40000, 13));
    expect(sampleMean(xs)).toBeCloseTo(100, 0);
    expect(sampleSd(xs) ** 2).toBeGreaterThan(80);
    expect(sampleSd(xs) ** 2).toBeLessThan(120);
  });

  it('poisson mean is monotone in λ', () => {
    const m = (lam: number) => sampleMean(poissonSamples(lam, seededFns(20000, 99)));
    expect(m(100)).toBeGreaterThan(m(50));
    expect(m(50)).toBeGreaterThan(m(8));
  });

  // Regression for the zero-total-weight mixture bug (proposal §6 #3): all-zero
  // weights once produced a NaN cumulative array. The guard falls back to equal
  // weights, so the result is a real 50/50 mix of the two components and finite.
  it('mixture with all-zero weights falls back to equal weights (no NaN)', () => {
    const fns = seededFns(20000, 5);
    const a = normalSamples(0, 0.01, fns); // tight cluster near 0
    const b = normalSamples(100, 0.01, fns); // tight cluster near 100
    const mix = mixtureSamples([a, b], fns, [0, 0]);
    expect(Array.from(mix).some(Number.isNaN)).toBe(false);
    const fromB = Array.from(mix).filter((x) => x > 50).length / mix.length;
    expect(fromB).toBeGreaterThan(0.4);
    expect(fromB).toBeLessThan(0.6);
  });

  it('mixture honours non-trivial weights (75/25)', () => {
    const fns = seededFns(20000, 6);
    const a = normalSamples(0, 0.01, fns);
    const b = normalSamples(100, 0.01, fns);
    const mix = mixtureSamples([a, b], fns, [3, 1]);
    const fromB = Array.from(mix).filter((x) => x > 50).length / mix.length;
    expect(fromB).toBeCloseTo(0.25, 1);
  });
});
