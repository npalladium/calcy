import { describe, expect, it } from 'vitest';
import { num, values } from './helpers';

// A friendlier call DSL: named arguments, `weight: value` pairs, the `|>` pipe,
// `f of x` for unary calls, and the cagr growth-rate function. Equivalences are
// asserted against the positional forms (same seed → identical samples).
const STAT = { N: 20000, seed: 7 };
const summ = (src: string) => {
  const s = values(src, STAT)[0];
  if (s.error) throw new Error(`${src} → ${s.error}`);
  return s.summary;
};

describe('named arguments', () => {
  it('are order-independent and match positional', () => {
    expect(summ('pert(high=8, low=2, likely=3) day')).toEqual(summ('pert(2, 3, 8) day'));
    expect(summ('normal(sd=15, mean=100)')).toEqual(summ('normal(100, 15)'));
  });

  it('accept aliases', () => {
    expect(summ('pert(lo=2, ml=3, hi=8) day')).toEqual(summ('pert(2, 3, 8) day'));
    expect(summ('uniform(min=0, max=10)')).toEqual(summ('uniform(0, 10)'));
  });

  it('support clamp with a named lower bound only', () => {
    const s = summ('clamp(x=(1 to 9), lo=2)');
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(s.min).toBeGreaterThanOrEqual(2);
  });

  it('report friendly errors', () => {
    expect(values('normal(mean=1, foo=2)')[0].error).toMatch(/unknown argument/);
    expect(values('normal(mean=1, mean=2)')[0].error).toMatch(/twice/);
    // Mixing positional + named is now allowed (post-update ergonomics).
    expect(values('update(beta(2,8), k=3, n=10)')[0].error).toBeUndefined();
    expect(values('sum(a=1)')[0].error).toMatch(/named/);
  });
});

describe('weight: value pairs', () => {
  it('drive discrete and match the alternating form', () => {
    expect(summ('discrete(0.25: 0, 0.75: 10)')).toEqual(summ('discrete(0.25, 0, 0.75, 10)'));
  });

  it('read naturally with percentages', () => {
    const s = summ('discrete(20%: 0, 80%: 10)');
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(s.mean).toBeGreaterThan(7.5);
    expect(s.mean).toBeLessThan(8.5);
  });

  it('weight a mixture', () => {
    expect(values('mixture(0.5: 1 to 2, 0.5: 8 to 9)', STAT)[0].isDist).toBe(true);
  });

  it('are rejected on functions that do not take them', () => {
    expect(values('normal(0.5: 1)')[0].error).toMatch(/only for discrete|pairs/);
  });
});

describe('pipe |>', () => {
  it('pipes into a unary function', () => {
    expect(num('16 |> sqrt')).toBe(4);
    expect(num('2.1 |> ceil')).toBe(3);
  });

  it('pipes as the first argument of a multi-arg function', () => {
    expect(num('(800 to 1200) |> p(0.95)', STAT)).toBeCloseTo(num('p(800 to 1200, 0.95)', STAT), 6);
  });

  it('chains left-to-right', () => {
    expect(num('(1 to 100) |> p(0.95) |> ceil', STAT)).toBe(
      Math.ceil(num('p(1 to 100, 0.95)', STAT))
    );
  });

  it('errors when not followed by a function', () => {
    expect(values('5 |> 3')[0].error).toMatch(/must be followed by a function/);
  });
});

describe('of (unary application)', () => {
  it('reads f of x as f(x)', () => {
    expect(num('sqrt of 16')).toBe(4);
    expect(num('ceil of 2.1')).toBe(3);
  });

  it('grabs a tight operand — a unit attaches, later operators stay outside', () => {
    expect(num('sqrt of 16 m2 in m')).toBeCloseTo(4, 9);
    expect(num('ceil of 2.1 + 10')).toBe(13); // (ceil of 2.1) + 10
  });

  it('takes the mean of a distribution', () => {
    expect(num('mean of (0 to 10)', STAT)).toBeGreaterThan(3);
  });
});

describe('cagr(start, end, periods)', () => {
  it('computes the compound growth rate per period', () => {
    expect(num('cagr(100, 146.41, 4)')).toBeCloseTo(0.1, 3); // 1.1^4 = 1.4641
  });

  it('is dimensionless and unit-tolerant', () => {
    expect(num('cagr(100 req, 200 req, 10)')).toBeCloseTo(2 ** 0.1 - 1, 4);
  });

  it('accepts named arguments', () => {
    expect(num('cagr(start=100, end=146.41, periods=4)')).toBeCloseTo(0.1, 3);
  });

  it('requires start and end to share units', () => {
    expect(values('cagr(100 req, 200 day, 4)')[0].error).toMatch(/share units/);
  });
});
