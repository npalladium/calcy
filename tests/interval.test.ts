import { describe, expect, it } from 'vitest';
import { values } from './helpers';

// interval(d, level) — the central [lo, hi] band at a confidence level, as a
// 2-element list. Sugar for [p(d, (1−level)/2), p(d, (1+level)/2)]. Distinct
// from the ci(...) *constructor*: interval *extracts* a band from a simulated
// result. Composes with reducers (min/max over the returned list).
const STAT = { N: 60000, seed: 7 };

const listOf = (src: string, opts = STAT): number[] => {
  const l = values(src, opts)[0];
  if (l.error) throw new Error(`${src} → ${l.error}`);
  if (l.summary?.kind !== 'list') throw new Error(`expected list for: ${src}`);
  return l.summary.list;
};

const val = (src: string, opts = STAT): number => {
  const l = values(src, opts)[0];
  if (l.error) throw new Error(`${src} → ${l.error}`);
  return Number(l.display?.value);
};

describe('interval(d, level)', () => {
  // The band comes from the engine's inverse-normal, a ~4.5e-4 rational
  // approximation, so these analytic values are asserted to ~1 decimal.
  it('returns the [p5, p95] band at level 0.9 (analytic for normal)', () => {
    // normal(100, 15): p5 = 100 − 1.6449·15 ≈ 75.33, p95 ≈ 124.67
    const [lo, hi] = listOf('interval(normal(100, 15), 0.9)');
    expect(lo).toBeCloseTo(75.33, 1);
    expect(hi).toBeCloseTo(124.67, 1);
  });

  it('defaults to the sheet confidence level when omitted', () => {
    // FAST/default confidence is 0.9, so interval(d) == interval(d, 0.9)
    const [lo, hi] = listOf('interval(normal(100, 15))');
    expect(lo).toBeCloseTo(75.33, 1);
    expect(hi).toBeCloseTo(124.67, 1);
  });

  it('a narrower level gives the [p25, p75] band', () => {
    // level 0.5 → tails at 0.25/0.75: 100 ∓ 0.6745·15 ≈ 89.88 / 110.12
    const [lo, hi] = listOf('interval(normal(100, 15), 0.5)');
    expect(lo).toBeCloseTo(89.88, 1);
    expect(hi).toBeCloseTo(110.12, 1);
  });

  it('works for a sample-only family (pert) via the empirical quantiles', () => {
    const [lo, hi] = listOf('interval(pert(2, 5, 20), 0.9)');
    expect(lo).toBeGreaterThan(2);
    expect(hi).toBeLessThan(20);
    expect(hi).toBeGreaterThan(lo);
  });

  it('composes with reducers over the returned list', () => {
    expect(val('max(interval(normal(100, 15), 0.9))')).toBeCloseTo(124.673, 1);
    expect(val('min(interval(normal(100, 15), 0.9))')).toBeCloseTo(75.327, 1);
  });

  it('renders as a bracketed interval carrying the distribution unit', () => {
    // The unit must ride the distribution (its hint propagates), not be
    // multiplied onto the list result — list arithmetic isn't supported.
    const l = values('interval(200 to 500 ms, 0.9)', STAT)[0];
    expect(l.display?.text).toMatch(/^\[.*….*\] ms$/);
    expect(l.display?.unit).toBe('ms');
  });

  it('rejects a list input and an out-of-range level', () => {
    expect(values('interval([1, 2, 3], 0.9)')[0].error).toMatch(/distribution|list/);
    expect(values('interval(normal(0, 1), 1.5)')[0].error).toMatch(/between 0 and 1|level/);
  });
});
