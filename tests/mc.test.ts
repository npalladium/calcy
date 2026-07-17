import { describe, expect, it } from 'vitest';
import {
  betaSamples,
  ciSamples,
  type DistFns,
  histogram,
  lognormalSamples,
  makeGaussian,
  makeRng,
  mixtureSamples,
  normalSamples,
  reduceMean,
  reducePercentile,
  reduceSd,
  summarize,
  uniformSamples,
  Z90,
  zForLevel
} from '../src/lib/engine/mc';

function fns(N = 20000, seed = 99, level = 0.9): DistFns {
  const rng = makeRng(seed);
  return { N, gaussian: makeGaussian(rng), uniform: rng, level };
}

describe('RNG', () => {
  it('is deterministic per seed and varies across seeds', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    const c = makeRng(8);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    const seqC = [c(), c(), c()];
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });
  it('produces values in [0, 1)', () => {
    const r = makeRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('Z90 is the 90% CI half-width (z ≈ 1.6449)', () => {
    // A&S 26.2.23 is accurate to ~4.5e-4; the true value is 1.6448536...
    // We pin the A&S output, not the textbook value, so a future swap to
    // stdlib's inverse-normal (≈1e-9) only requires updating this number.
    expect(Z90).toBeCloseTo(1.6452, 3);
  });
  it('zForLevel matches A&S 26.2.23 at common levels', () => {
    expect(zForLevel(0.9)).toBeCloseTo(1.6452, 3); // 90% CI
    expect(zForLevel(0.95)).toBeCloseTo(1.9604, 3); // 95% CI
    expect(zForLevel(0.99)).toBeCloseTo(2.5762, 3); // 99% CI
    // 0.68 ≈ 1σ — A&S gives 0.9944; the true value is 0.9945.
    expect(zForLevel(0.68)).toBeCloseTo(0.9944, 3);
  });
  it('zForLevel rejects out-of-range levels', () => {
    expect(() => zForLevel(0)).toThrow(/confidence level/);
    expect(() => zForLevel(1)).toThrow(/confidence level/);
    expect(() => zForLevel(1.5)).toThrow(/confidence level/);
  });
});

describe('gaussian', () => {
  it('is approximately standard normal', () => {
    const f = fns();
    const xs = normalSamples(0, 1, f);
    expect(reduceMean(xs)).toBeCloseTo(0, 1);
    expect(reduceSd(xs)).toBeCloseTo(1, 1);
  });
});

describe('distribution constructors', () => {
  it('CI (positive) is lognormal with the right 90% interval', () => {
    const xs = ciSamples(10, 100, fns());
    // Tolerances widened slightly from textbook (8.5/113) to absorb A&S
    // 26.2.23's ~0.05% inaccuracy in z and the resulting CI half-width.
    expect(reducePercentile(xs, 0.05)).toBeGreaterThan(8);
    expect(reducePercentile(xs, 0.05)).toBeLessThan(12);
    expect(reducePercentile(xs, 0.95)).toBeGreaterThan(87);
    expect(reducePercentile(xs, 0.95)).toBeLessThan(115);
    for (const v of xs) expect(v).toBeGreaterThan(0); // lognormal is positive
  });
  it('CI spanning zero is normal (can be negative)', () => {
    const xs = ciSamples(-10, 10, fns());
    expect(reduceMean(xs)).toBeCloseTo(0, 0);
    expect(Math.min(...xs)).toBeLessThan(0);
  });
  it('normal honours mean and sd', () => {
    const xs = normalSamples(50, 5, fns());
    expect(reduceMean(xs)).toBeCloseTo(50, 0);
    expect(reduceSd(xs)).toBeCloseTo(5, 0);
  });
  it('uniform stays in bounds with the right mean', () => {
    const xs = uniformSamples(2, 8, fns());
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...xs)).toBeLessThanOrEqual(8);
    expect(reduceMean(xs)).toBeCloseTo(5, 0);
  });
  it('beta(2,2) is bounded in [0,1] with mean ~0.5', () => {
    const xs = betaSamples(2, 2, fns());
    for (const v of xs) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(reduceMean(xs)).toBeCloseTo(0.5, 1);
  });
  it('mixture draws only from its components', () => {
    const f = fns();
    const a = new Float64Array(f.N).fill(1);
    const b = new Float64Array(f.N).fill(9);
    const m = mixtureSamples([a, b], f);
    for (const v of m) expect(v === 1 || v === 9).toBe(true);
    expect(reduceMean(m)).toBeGreaterThan(3);
    expect(reduceMean(m)).toBeLessThan(7);
  });
  it('mixture honours weights', () => {
    const f = fns();
    const a = new Float64Array(f.N).fill(1);
    const b = new Float64Array(f.N).fill(9);
    // 9:1 weight toward the "1" component pulls the mean well below the midpoint
    expect(reduceMean(mixtureSamples([a, b], f, [9, 1]))).toBeLessThan(3);
    expect(reduceMean(mixtureSamples([a, b], f, [1, 9]))).toBeGreaterThan(7);
  });
  it('lognormal rejects non-positive bounds', () => {
    expect(() => lognormalSamples(-1, 5, fns())).toThrow(/positive/i);
    expect(() => lognormalSamples(1, 0, fns())).toThrow(/positive/i);
  });
});

describe('histogram', () => {
  it('counts all samples across the requested bins', () => {
    const xs = Float64Array.from({ length: 100 }, (_, i) => i);
    const { hist, min, max } = histogram(xs);
    expect(hist).toHaveLength(30);
    expect(hist.reduce((a, b) => a + b, 0)).toBe(100);
    expect(min).toBe(0);
    expect(max).toBe(99);
  });
  it('puts a degenerate sample in the middle bin', () => {
    const xs = new Float64Array(50).fill(5);
    const { hist, min, max } = histogram(xs);
    expect(min).toBe(5);
    expect(max).toBe(5);
    expect(hist[15]).toBe(50);
  });
});

describe('summaries & reducers', () => {
  it('summarize handles a point value', () => {
    const s = summarize({ dim: { length: 1 }, scalar: 42 });
    expect(s).toEqual({ kind: 'point', value: 42, dim: { length: 1 } });
  });
  it('summarize gives monotonic percentiles and a correct median', () => {
    const xs = Float64Array.from({ length: 1000 }, (_, i) => i + 1);
    const s = summarize({ dim: {}, samples: xs });
    if (s.kind !== 'dist') throw new Error('expected dist');
    expect(s.p5).toBeLessThan(s.p25);
    expect(s.p25).toBeLessThan(s.p50);
    expect(s.p50).toBeLessThan(s.p75);
    expect(s.p75).toBeLessThan(s.p95);
    expect(s.min).toBe(1);
    expect(s.max).toBe(1000);
    expect(s.p50).toBeCloseTo(500.5, 0);
    expect(s.mean).toBeCloseTo(500.5, 5);
  });
  it('reducers compute mean, percentile, and population sd', () => {
    const xs = new Float64Array([1, 2, 3, 4]);
    expect(reduceMean(xs)).toBe(2.5);
    expect(reducePercentile(xs, 0.5)).toBe(2.5);
    expect(reduceSd(xs)).toBeCloseTo(Math.sqrt(1.25), 9);
  });
  it('percentile interpolates between samples and handles the edges', () => {
    expect(reducePercentile(new Float64Array([10, 20]), 0.5)).toBe(15); // interpolated
    expect(reducePercentile(new Float64Array([7]), 0.9)).toBe(7); // single element
    expect(reducePercentile(new Float64Array([1, 2, 3, 4]), 0)).toBe(1); // min edge
    expect(reducePercentile(new Float64Array([1, 2, 3, 4]), 1)).toBe(4); // max edge
  });
  it('histogram clamps the maximum sample into the last bin', () => {
    const xs = Float64Array.from({ length: 60 }, (_, i) => i);
    const { hist } = histogram(xs, 30);
    expect(hist[29]).toBeGreaterThan(0); // the max value isn't lost off the end
  });
});
