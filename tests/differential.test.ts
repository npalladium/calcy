import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { summarize } from '../src/lib/engine/mc';
import { evalSrc, makeEngine, sampleMean, sampleSd, seededFns, values } from './helpers';

// Differential + metamorphic testing of the engine.
//
// calcy has three evaluation paths for the same quantity: the scalar fast path
// (eval.ts:binop), the closed-form analytical layer (closed-form.ts + the
// `meta` moments in mc.ts:summarize), and the Monte-Carlo sample path. This
// file asserts they AGREE — the strongest, cheapest oracle the engine has,
// needing no external reference.
//
// Invariants asserted here:
//   1. For every meta-carrying distribution, the analytical moment (read off
//      `meta`) matches the empirical moment of the realised samples.
//   2. Metamorphic relations hold over arbitrary inputs: linear scaling,
//      shift-by-reuse cancellation, conversion is an isomorphism, and CI
//      bounds are monotone in the realised percentiles.

const N = 40000;
const fns = () => seededFns(N, 0xa11ce);

// Each case: a constructor whose `meta` gives an exact analytical mean/sd, and
// the loose relative tolerance the *empirical* sample mean/sd must meet at this
// N. Heavy-tailed families (lognormal) converge slowly, so they get more room;
// the point is agreement, not a tight CLT bound.
const FAMILIES: { src: string; meanTol: number; sdTol: number }[] = [
  { src: 'normal(100, 15)', meanTol: 0.01, sdTol: 0.03 },
  { src: 'uniform(0, 1)', meanTol: 0.01, sdTol: 0.02 },
  { src: 'lognormal(10, 100)', meanTol: 0.06, sdTol: 0.15 },
  { src: 'exponential(5)', meanTol: 0.03, sdTol: 0.05 },
  { src: 'beta(2, 5)', meanTol: 0.01, sdTol: 0.03 },
  { src: 'triangular(2, 3, 8)', meanTol: 0.02, sdTol: 0.04 },
  { src: 'pert(2, 3, 8)', meanTol: 0.02, sdTol: 0.04 },
  { src: 'poisson(40)', meanTol: 0.02, sdTol: 0.05 }
];

describe('analytical vs Monte-Carlo agreement (the meta path equals the sample path)', () => {
  for (const { src, meanTol, sdTol } of FAMILIES) {
    it(`${src}: analytical mean/sd match the realised samples`, () => {
      const v = evalSrc(src, fns());
      if (!v.samples || !v.meta) throw new Error(`${src} did not produce a meta distribution`);
      const s = summarize(v); // mean/sd here are analytical (overridden from meta)
      if (s.kind !== 'dist') throw new Error('expected dist summary');

      const empMean = sampleMean(v.samples);
      const empSd = sampleSd(v.samples);

      // analytical mean ≈ empirical mean
      expect(Math.abs(s.mean - empMean) / (Math.abs(s.mean) || 1)).toBeLessThan(meanTol);
      // analytical sd ≈ empirical sd
      expect(Math.abs(s.sd - empSd) / (Math.abs(s.sd) || 1)).toBeLessThan(sdTol);
    });
  }

  // Regression: the PERT analytical sd formula once used μ₁(1−μ₂)/4 instead of
  // the Beta variance μ₁(μ₂−μ₁), under-reporting sd by ~40%. Pin the exact
  // closed-form value so the formula can't silently drift again.
  it('pert(2,3,8) analytical sd equals the exact Beta-PERT sd', () => {
    const s = summarize(evalSrc('pert(2, 3, 8)', fns()));
    if (s.kind !== 'dist') throw new Error('expected dist');
    // α=1+4·1/6, β=1+4·5/6 → span·√(μ₁(μ₂−μ₁)) = 1.01577…
    expect(s.sd).toBeCloseTo(1.0157, 3);
  });

  it('deterministic expressions take the scalar path, never a 1-sample dist', () => {
    const v = evalSrc('2 + 3 * 4');
    expect(v.scalar).toBe(14);
    expect(v.samples).toBeUndefined();
    expect(summarize(v).kind).toBe('point');
  });
});

// Metamorphic relations: properties that must hold for ANY input, with no
// oracle. A generator explores the space; the relation is the assertion.
describe('metamorphic: linear scaling', () => {
  it('mean(k·X) = k·mean(X) and sd(k·X) = |k|·sd(X)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 50 }), fc.integer({ min: 1, max: 9 }), (mean, k) => {
        const ls = values(`x = normal(${mean}, 5)\n${k} * x`, { N: 20000, seed: 9 });
        const base = ls[0].summary;
        const scaled = ls[1].summary;
        if (base?.kind !== 'dist' || scaled?.kind !== 'dist') throw new Error('expected dist');
        expect(scaled.mean).toBeCloseTo(k * base.mean, 6);
        expect(scaled.sd).toBeCloseTo(k * base.sd, 6);
      })
    );
  });
});

describe('metamorphic: shift-by-reuse cancels exactly', () => {
  it('(X + c) − c is sample-identical to X for any CI and any c', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 1e3, noNaN: true }),
        fc.double({ min: 0.1, max: 1e3, noNaN: true }),
        fc.double({ min: -1e4, max: 1e4, noNaN: true }),
        (lo, hi, c) => {
          const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
          const ls = values(`x = ${a} to ${b}\nx\n(x + ${c}) - ${c}`, { N: 4000, seed: 3 });
          const x = ls[1].summary;
          const back = ls[2].summary;
          if (x?.kind !== 'dist' || back?.kind !== 'dist') throw new Error('expected dist');
          // Reuse preserves the exact sample array, so every percentile matches.
          expect(back.p5).toBeCloseTo(x.p5, 9);
          expect(back.p50).toBeCloseTo(x.p50, 9);
          expect(back.p95).toBeCloseTo(x.p95, 9);
        }
      )
    );
  });
});

describe('metamorphic: unit conversion is an isomorphism', () => {
  it('converting out and back is the identity (to display precision)', () => {
    fc.assert(
      fc.property(fc.double({ min: 1e-3, max: 1e6, noNaN: true }), (x) => {
        const e = makeEngine();
        const there = Number(e.evalSheet(`${x} km in mi`).lines[0].display?.value);
        const back = Number(e.evalSheet(`${there} mi in km`).lines[0].display?.value);
        expect(Math.abs(back - x) / x).toBeLessThan(1e-3);
      })
    );
  });

  it('expressing one quantity in two scales differs by exactly the scale ratio', () => {
    const inM = Number(values('1000 m in m')[0].display?.value);
    const inKm = Number(values('1000 m in km')[0].display?.value);
    expect(inM / inKm).toBeCloseTo(1000, 9);
  });
});

describe('metamorphic: CI percentiles are monotone in the bounds', () => {
  it('widening the upper bound never lowers p95', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100, noNaN: true }),
        fc.double({ min: 1, max: 100, noNaN: true }),
        (extra1, extra2) => {
          const lo = 1;
          const mid = lo + 10 + Math.min(extra1, extra2);
          const hi = lo + 10 + Math.max(extra1, extra2);
          const narrow = values(`${lo} to ${mid}`, { N: 20000, seed: 5 })[0].summary;
          const wide = values(`${lo} to ${hi}`, { N: 20000, seed: 5 })[0].summary;
          if (narrow?.kind !== 'dist' || wide?.kind !== 'dist') throw new Error('expected dist');
          // Same seed, same draws, wider log-spread → p95 cannot shrink.
          expect(wide.p95).toBeGreaterThanOrEqual(narrow.p95 - 1e-9);
        }
      )
    );
  });
});
