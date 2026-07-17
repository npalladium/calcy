import { describe, expect, it } from 'vitest';
import { evalNode } from '../src/lib/engine/eval';
import { correlateJoint, correlateTo } from '../src/lib/engine/mc';
import { makeCtx, parse, seededFns, values } from './helpers';

// correlate(reference, marginal, r) — single-line pairwise coupling. Iman–Conover
// with the reference held fixed: reorder the marginal's samples to hit rank
// correlation r with the reference, preserving the marginal exactly.

// Spearman rank correlation: Pearson correlation of the two arrays' ranks.
function spearman(a: Float64Array, b: Float64Array): number {
  const rank = (xs: Float64Array): Float64Array => {
    const idx = Array.from({ length: xs.length }, (_, i) => i).sort((p, q) => xs[p] - xs[q]);
    const r = new Float64Array(xs.length);
    idx.forEach((orig, k) => {
      r[orig] = k;
    });
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += ra[i];
    mb += rb[i];
  }
  ma /= n;
  mb /= n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = ra[i] - ma;
    const db = rb[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  return cov / Math.sqrt(va * vb);
}

// The exact multiset of a sample array, sorted — used to assert the marginal is
// untouched (correlate only permutes).
const sortedCopy = (xs: Float64Array): number[] => Array.from(xs).sort((a, b) => a - b);

describe('correlateTo (Iman–Conover, reference fixed)', () => {
  const fns = seededFns(40000, 7);
  const draw = (n: number, seed: number): Float64Array => {
    const f = seededFns(n, seed);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = f.gaussian();
    return out;
  };

  it('preserves the marginal exactly (result is a permutation of y)', () => {
    const x = draw(40000, 1);
    const y = draw(40000, 2);
    const out = correlateTo(x, y, 0.6, fns);
    expect(sortedCopy(out)).toEqual(sortedCopy(y));
  });

  it('induces the requested rank correlation (positive, negative, zero)', () => {
    const x = draw(40000, 11);
    const y = draw(40000, 22);
    expect(spearman(x, correlateTo(x, y, 0.6, fns))).toBeCloseTo(0.6, 1);
    expect(spearman(x, correlateTo(x, y, -0.5, fns))).toBeCloseTo(-0.5, 1);
    expect(Math.abs(spearman(x, correlateTo(x, y, 0, fns)))).toBeLessThan(0.05);
  });
});

describe('correlateJoint (Iman–Conover, symmetric N-variable)', () => {
  const fns = seededFns(40000, 13);
  const draw = (n: number, seed: number): Float64Array => {
    const f = seededFns(n, seed);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = f.gaussian();
    return out;
  };

  it('preserves every marginal exactly (each column is a permutation of its input)', () => {
    const cols = [draw(40000, 1), draw(40000, 2), draw(40000, 3)];
    const target = [
      [1, 0.6, -0.3],
      [0.6, 1, 0.1],
      [-0.3, 0.1, 1]
    ];
    const out = correlateJoint(cols, target, fns);
    for (let j = 0; j < cols.length; j++) expect(sortedCopy(out[j])).toEqual(sortedCopy(cols[j]));
  });

  it('induces the requested pairwise rank correlations', () => {
    const cols = [draw(40000, 11), draw(40000, 22), draw(40000, 33)];
    const target = [
      [1, 0.6, -0.3],
      [0.6, 1, 0.1],
      [-0.3, 0.1, 1]
    ];
    const out = correlateJoint(cols, target, fns);
    expect(spearman(out[0], out[1])).toBeCloseTo(0.6, 1);
    expect(spearman(out[0], out[2])).toBeCloseTo(-0.3, 1);
    expect(spearman(out[1], out[2])).toBeCloseTo(0.1, 1);
  });

  it('returns a single column unchanged (nothing to couple)', () => {
    const c = draw(100, 9);
    const out = correlateJoint([c], [[1]], fns);
    expect(out[0]).toBe(c);
  });

  it('throws on a target that is not positive definite', () => {
    const cols = [draw(1000, 1), draw(1000, 2), draw(1000, 3)];
    // r12 = r13 = 0.9 but r23 = -0.9 is jointly impossible.
    const bad = [
      [1, 0.9, 0.9],
      [0.9, 1, -0.9],
      [0.9, -0.9, 1]
    ];
    expect(() => correlateJoint(cols, bad, fns)).toThrow(/positive definite/);
  });
});

describe('correlate(reference, marginal, r) — engine', () => {
  it('produces a distribution correlated with the reference at ~r', () => {
    const ctx = makeCtx(seededFns(40000, 3));
    const traffic = evalNode(parse('normal(50, 10)'), ctx);
    ctx.env.set('traffic', traffic);
    const conv = evalNode(parse('correlate(traffic, normal(2, 0.5), 0.6)'), ctx);
    expect(conv.samples).toBeDefined();
    expect(spearman(traffic.samples as Float64Array, conv.samples as Float64Array)).toBeCloseTo(
      0.6,
      1
    );
  });

  it('keeps the marginal family and moments (mean ~2, sd ~0.5)', () => {
    const ctx = makeCtx(seededFns(40000, 4));
    ctx.env.set('t', evalNode(parse('normal(50, 10)'), ctx));
    const conv = evalNode(parse('correlate(t, normal(2, 0.5), 0.6)'), ctx);
    // meta is preserved (still normal), so analytic mean/sd hold.
    expect(conv.meta).toEqual({ kind: 'normal', mean: 2, sd: 0.5 });
  });

  it('couples downstream via correlation-by-reuse', () => {
    // corr(traffic, conv) > 0 ⇒ product variance exceeds the independent case.
    const ctx = makeCtx(seededFns(40000, 5));
    ctx.env.set('traffic', evalNode(parse('normal(50, 10)'), ctx));
    const conv = evalNode(parse('correlate(traffic, normal(20, 5), 0.8)'), ctx);
    ctx.env.set('conv', conv);
    const product = evalNode(parse('traffic * conv'), ctx);
    expect(product.samples).toBeDefined();
    expect(
      spearman(ctx.env.get('traffic')?.samples as Float64Array, conv.samples as Float64Array)
    ).toBeGreaterThan(0.7);
  });

  it('rejects |r| >= 1 and non-distribution operands', () => {
    expect(values('correlate(normal(0, 1), normal(0, 1), 1)')[0].error).toMatch(/\|r\| < 1/);
    expect(values('t = 5\ncorrelate(t, normal(0, 1), 0.5)')[1].error).toMatch(
      /reference must be a distribution/
    );
    expect(values('correlate(normal(0, 1), 5, 0.5)')[0].error).toMatch(
      /marginal must be a distribution/
    );
  });
});
