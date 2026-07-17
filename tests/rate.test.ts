import { describe, expect, it } from 'vitest';
import { geometricSum } from '../src/lib/engine';
import { makeEngine } from './helpers';

describe('rate card (FR3)', () => {
  const e = makeEngine();
  e.evalSheet('100 req/s');
  const card = e.evalSheet('100 req/s').lines[0].rateCard;

  it('covers all seven time bases', () => {
    expect(card?.map((c) => c.period)).toEqual([
      'second',
      'minute',
      'hour',
      'day',
      'week',
      'month',
      'year'
    ]);
  });
  it('re-expresses the rate per period', () => {
    const get = (p: string) => card?.find((c) => c.period === p)?.display.text;
    expect(get('second')).toBe('100 req/s');
    expect(get('minute')).toBe('6000 req/min');
    expect(get('hour')).toBe('360000 req/h');
    expect(get('day')).toBe('8.64e6 req/day');
  });
});

describe('accumulation (FR4)', () => {
  it('multiplies a rate by a duration, cancelling time', () => {
    const e = makeEngine();
    e.evalSheet('100 req/s');
    const total = e.accumulate(0, 'day', 1);
    expect(total?.unit).toBe('req');
    // `value` is the raw machine-parseable number; the user-facing `text`
    // is what carries the formatted display (FAST uses scientific: 8.64e6).
    expect(total?.value).toBe('8640000'); // 100 * 86400
    expect(total?.text).toBe('8.64e6 req');
  });
  it('scales linearly with the window', () => {
    const e = makeEngine();
    e.evalSheet('100 req/s');
    const one = Number(e.accumulate(0, 'day', 1)?.value);
    const two = Number(e.accumulate(0, 'day', 2)?.value);
    // values are exact integers; compare precisely
    expect(Math.abs(two - 2 * one) / (2 * one)).toBeLessThan(0.01);
  });
  it('returns null for a non-rate line', () => {
    const e = makeEngine();
    e.evalSheet('5 km');
    expect(e.accumulate(0, 'day', 1)).toBeNull();
  });
  it('accumulates an uncertain rate into a distribution', () => {
    const e = makeEngine();
    e.evalSheet('(800 to 1200) req/s');
    const total = e.accumulate(0, 'month', 1);
    expect(total?.kind).toBe('dist');
    expect(total?.unit).toBe('req');
  });
});

describe('geometric-series growth (stretch §1.5)', () => {
  it('sums (1+g)^k for k in [0, n)', () => {
    expect(geometricSum(3, 0)).toBe(3); // 1 + 1 + 1
    expect(geometricSum(1, 0.1)).toBeCloseTo(1, 9); // single period, no growth applied
    expect(geometricSum(0, 0.5)).toBe(0);
    expect(geometricSum(3, 0.1)).toBeCloseTo(3.31, 6); // 1 + 1.1 + 1.21
    expect(geometricSum(2, -0.5)).toBeCloseTo(1.5, 6); // 1 + 0.5
  });

  it('reduces to plain accumulation when growth is zero', () => {
    const e = makeEngine();
    e.evalSheet('100 req/s');
    const plain = Number(e.accumulate(0, 'month', 12)?.value);
    const zero = Number(e.accumulate(0, 'month', 12, 0)?.value);
    expect(zero).toBe(plain);
  });

  it('accumulates more under positive growth', () => {
    const e = makeEngine();
    e.evalSheet('100 req/s');
    const flat = Number(e.accumulate(0, 'month', 12, 0)?.value);
    const grown = Number(e.accumulate(0, 'month', 12, 0.1)?.value);
    // 12 months at 10%/month: geometricSum(12,0.1)/12 ≈ 1.78x
    expect(grown / flat).toBeCloseTo(geometricSum(12, 0.1) / 12, 2);
  });
});

describe('statsTable (FR5.5)', () => {
  it('returns nine labelled rows for a distribution', () => {
    const e = makeEngine();
    e.evalSheet('1 to 100');
    const rows = e.statsTable(0);
    expect(rows?.map((r) => r.label)).toEqual([
      'mean',
      'sd',
      'min',
      'p5',
      'p25',
      'median',
      'p75',
      'p95',
      'max'
    ]);
  });
  it('returns null for a deterministic line', () => {
    const e = makeEngine();
    e.evalSheet('5 km');
    expect(e.statsTable(0)).toBeNull();
  });
});

describe('sensitivity (stretch §1.5)', () => {
  it('ranks the inputs that drive an output distribution', () => {
    const e = makeEngine();
    // c depends on both a and b; d is unrelated noise.
    e.evalSheet('a = 1 to 10\nb = 100 to 200\nd = 1 to 5\nc = a * b');
    const s = e.sensitivity(3); // line c
    expect(s).not.toBeNull();
    const names = (s ?? []).map((x) => x.name);
    expect(names).toContain('a');
    expect(names).toContain('b');
    // every reported contributor has positive explained variance, sorted desc
    for (const x of s ?? []) expect(x.r2).toBeGreaterThan(0);
    const r2s = (s ?? []).map((x) => x.r2);
    expect([...r2s].sort((p, q) => q - p)).toEqual(r2s);
  });

  it('returns null for a deterministic line', () => {
    const e = makeEngine();
    e.evalSheet('5 km');
    expect(e.sensitivity(0)).toBeNull();
  });
});

describe('custom units (FR2.5)', () => {
  it('via a `unit` directive', () => {
    const e = makeEngine();
    const lines = e.evalSheet('unit sprint = 2 week\n1 sprint in day').lines;
    expect(lines[0].kind).toBe('unitdef');
    expect(lines[1].display?.text).toBe('14 day');
  });
  it('via the constructor', () => {
    const e = makeEngine({}, { fortnight: '2 week' });
    expect(e.evalSheet('1 fortnight in day').lines[0].display?.text).toBe('14 day');
  });
  it('reports a bad definition without throwing', () => {
    const e = makeEngine();
    const line = e.evalSheet('unit bad = 5 km + 3 s').lines[0];
    expect(line.error).toBeTruthy();
  });
});

describe('sheet structure (FR1)', () => {
  it('blank and comment lines produce no value; errors are isolated', () => {
    const e = makeEngine();
    const lines = e.evalSheet('\n# a comment\n5 km + 3 s\n2 + 2').lines;
    expect(lines[0].kind).toBe('blank');
    expect(lines[1].kind).toBe('comment');
    expect(lines[2].error).toBeTruthy();
    expect(lines[3].display?.text).toBe('4'); // unaffected by the error above
  });
});
