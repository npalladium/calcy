import { describe, expect, it } from 'vitest';
import { values } from './helpers';

// Syntax proposal §5 — `given` conditioning (truncation).
//
// `X given <predicate>` keeps only the draws of X where the predicate holds —
// a truncated/conditional distribution. `given` stays polymorphic: the
// Bayesian-update shape `prior given k of n` is unchanged; a comparison after
// `given` triggers conditioning instead.

const summaryOf = (sheet: string) => {
  const ls = values(sheet, { N: 20000, seed: 7 });
  return ls[ls.length - 1].summary;
};

describe('given as truncation', () => {
  it('`d given d > 0` removes the left tail (min ≥ 0)', () => {
    const s = summaryOf('d = normal(100, 60)\nd given d > 0');
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(s.min).toBeGreaterThanOrEqual(0);
    // truncating the left tail can only raise the mean
    expect(s.mean).toBeGreaterThan(100);
  });

  it('`x given x < 50` keeps only the lower part (max < 50)', () => {
    const s = summaryOf('x = 1 to 100\nx given x < 50');
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(s.max).toBeLessThan(50);
  });

  it('a two-sided condition truncates both tails', () => {
    const s = summaryOf('x = normal(0, 10)\nx given x > -5');
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(s.min).toBeGreaterThanOrEqual(-5);
  });

  it('errors when the condition is never satisfied', () => {
    expect(
      values('x = 1 to 10\nx given x > 1000')[0].error ||
        values('x = 1 to 10\nx given x > 1000')[1].error
    ).toBeTruthy();
  });
});

describe('given still does Bayesian update with `k of n`', () => {
  it('`beta(2, 8) given 3 of 10` is unchanged (update, not conditioning)', () => {
    const ls = values('beta(2, 8) given 3 of 10');
    expect(ls[0].error).toBeFalsy();
    expect(ls[0].summary?.kind).toBe('dist');
  });
});
