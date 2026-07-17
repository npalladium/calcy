import { describe, expect, it } from 'vitest';
import { num, text, values } from './helpers';

// US-2 — task & project estimation: pert(), sum(above)/sum(…), comparison
// operators, and chance(predicate). Tighter N for the statistical assertions.
//
// Note the CI form: `(2 to 4) day` parenthesises the interval so the unit
// applies to both bounds; bare `2 to 4 day` would parse as `2 to (4 day)` and
// error on mismatched dimensions (the `to`/CI operator binds looser than the
// implicit multiplication of `4 day`).
const STAT = { N: 40000, seed: 7 };

describe('US-2 — pert() three-point estimate', () => {
  it('mean ≈ (lo + 4·ml + hi)/6 and support is [lo, hi]', () => {
    const s = values('pert(2, 3, 8) day', STAT)[0].summary;
    if (s?.kind !== 'dist') throw new Error('expected dist');
    // base units are seconds; compare in seconds by dividing through.
    const day = 86400;
    expect(s.mean / day).toBeGreaterThan(3.5);
    expect(s.mean / day).toBeLessThan(3.85);
    expect(s.min / day).toBeGreaterThanOrEqual(2);
    expect(s.max / day).toBeLessThanOrEqual(8);
  });

  it('rejects lo ≥ hi and out-of-range mode', () => {
    expect(values('pert(8, 3, 2)')[0].error).toMatch(/lo < hi/);
    expect(values('pert(2, 9, 8)')[0].error).toMatch(/most-likely/);
  });

  it('requires shared units across the three points', () => {
    expect(values('pert(2 day, 3 kg, 8 day)')[0].error).toMatch(/share units/);
  });
});

describe('US-2 — sum(above) and sum(…) roll-up', () => {
  const tasks = 'a = (2 to 4) day\nb = (5 to 12) day\nc = (1 to 3) day';

  it('sum(above) folds all preceding result lines', () => {
    const ls = values(`${tasks}\nsum(above) in day`);
    const s = ls[3].summary;
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(ls[3].display?.unit).toBe('day');
    expect(s.p5).toBeLessThan(s.p50);
    expect(s.p50).toBeLessThan(s.p95);
    // convolution, not worst-case stacking: the summed p95 is strictly below
    // the sum of the per-task p95s.
    const stacked =
      (ls[0].summary as { p95: number }).p95 +
      (ls[1].summary as { p95: number }).p95 +
      (ls[2].summary as { p95: number }).p95;
    expect(s.p95).toBeLessThan(stacked);
  });

  it('sum(above) == sum(a,b,c) == a+b+c (same draws, correlation-by-reuse)', () => {
    const ls = values(`${tasks}\nsum(above)\nsum(a, b, c)\na + b + c`);
    expect(ls[3].summary).toEqual(ls[4].summary);
    expect(ls[3].summary).toEqual(ls[5].summary);
  });

  it('sum with mismatched dimensions errors', () => {
    expect(values('sum(2 day, 3 kg)')[0].error).toMatch(/incompatible/i);
  });

  it('sum(above) with no preceding lines is 0', () => {
    expect(num('sum(above)')).toBe(0);
  });

  it('bare `above` outside sum is a clear error', () => {
    expect(values('above')[0].error).toMatch(/only valid as an argument to sum/);
  });
});

describe('US-2 — comparison operators', () => {
  it('deterministic comparisons yield 1/0', () => {
    expect(text('2 < 3')).toBe('1');
    expect(text('3 < 2')).toBe('0');
    expect(text('5 day >= 5 day')).toBe('1');
    expect(text('4 day > 5 day')).toBe('0');
  });

  it('comparing incompatible dimensions errors', () => {
    expect(values('1 day < 2 kg')[0].error).toMatch(/cannot compare/i);
  });
});

describe('US-2 — chance(predicate) deadline odds', () => {
  it('deterministic predicate gives 1 or 0', () => {
    expect(num('chance(3 day < 5 day)')).toBe(1);
    expect(num('chance(5 day < 3 day)')).toBe(0);
  });

  it('odds of meeting a deadline are a probability in [0,1]', () => {
    // values[0] is the `total` distribution line; values[1] is the chance.
    const p = Number(
      values('total = (10 to 20) day\nchance(total < 15 day)', STAT)[1].display?.value
    );
    expect(p).toBeGreaterThan(0.3);
    expect(p).toBeLessThan(0.7);
  });

  it('complementary events sum to exactly 1', () => {
    const ls = values(
      'total = (10 to 20) day\nchance(total < 15 day)\nchance(total >= 15 day)',
      STAT
    );
    expect(Number(ls[1].display?.value) + Number(ls[2].display?.value)).toBeCloseTo(1, 10);
  });

  it('rejects a dimensioned (non-predicate) argument', () => {
    expect(values('chance(5 day)')[0].error).toMatch(/dimensionless/);
  });
});

describe('CI trailing-unit distribution', () => {
  it('`2 to 4 day` distributes the unit (== `2 day to 4 day`)', () => {
    const a = values('2 to 4 day')[0];
    const b = values('2 day to 4 day')[0];
    expect(a.error).toBeUndefined();
    expect(a.summary).toEqual(b.summary);
    // median of lognormal(2,4) days ≈ √8 ≈ 2.83 (summary is in base seconds)
    if (a.summary?.kind !== 'dist') throw new Error('expected dist');
    const medDays = a.summary.p50 / 86400;
    expect(medDays).toBeGreaterThan(2.6);
    expect(medDays).toBeLessThan(3.0);
  });

  it('bounds stay additive: `2 to 4 + 1` is the dimensionless CI(2, 5)', () => {
    const r = values('2 to 4 + 1')[0];
    expect(r.error).toBeUndefined();
    expect(r.display?.unit ?? '').toBe('');
    expect(r.isDist).toBe(true);
  });

  it('complex trailing units still need parens, with a helpful hint', () => {
    expect(values('2 to 4 GB/s')[0].error).toMatch(/did you mean .*unit/);
  });

  it('a non-literal low bound also gets the hint', () => {
    expect(values('x = 5\nx to 4 day')[1].error).toMatch(/did you mean .*unit/);
  });
});
