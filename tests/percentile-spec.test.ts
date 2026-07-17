import { describe, expect, it } from 'vitest';
import { one, values } from './helpers';

// Syntax proposal §3 — percentile distribution specs.
//
// `p10: 5, p90: 50` fits a distribution whose 10th percentile is 5 and 90th is
// 50 (lognormal when both bounds are positive, normal otherwise). It reuses the
// `name: value` pair syntax and the same two-quantile fit as `lo to hi`, but
// lets the user pick the percentiles instead of the sheet-wide confidence.

const quantileAt = (spec: string, q: number) => {
  // line 0 is the `x = …` distribution; line 1 is the `p()` scalar we want.
  const ls = values(`x = ${spec}\nx |> p(${q})`, { N: 40000, seed: 3 });
  return Number(ls[1].display?.value);
};

describe('percentile specs fit the requested quantiles', () => {
  it('lognormal fit hits its p10 and p90 (analytical, exact)', () => {
    expect(quantileAt('p10: 5, p90: 50', 0.1)).toBeCloseTo(5, 3);
    expect(quantileAt('p10: 5, p90: 50', 0.9)).toBeCloseTo(50, 3);
  });

  it('order of the pairs does not matter', () => {
    expect(quantileAt('p90: 50, p10: 5', 0.1)).toBeCloseTo(5, 3);
    expect(quantileAt('p90: 50, p10: 5', 0.9)).toBeCloseTo(50, 3);
  });

  it('arbitrary percentiles (p25/p75) fit too', () => {
    expect(quantileAt('p25: 10, p75: 20', 0.25)).toBeCloseTo(10, 3);
    expect(quantileAt('p25: 10, p75: 20', 0.75)).toBeCloseTo(20, 3);
  });

  it('bounds spanning zero fit a normal (median midway)', () => {
    expect(quantileAt('p10: -5, p90: 5', 0.5)).toBeCloseTo(0, 6);
  });

  it('carries the dimension of its bounds', () => {
    const r = one('p10: 5 kg, p90: 50 kg');
    expect(r.error).toBeFalsy();
    expect(r.summary?.kind).toBe('dist');
  });
});

describe('percentile specs reject bad input', () => {
  it('needs exactly two percentile points', () => {
    expect(values('p10: 5')[0].error).toBeTruthy();
    expect(values('p10: 5, p50: 10, p90: 50')[0].error).toBeTruthy();
  });

  it('percentiles must be in (0, 100)', () => {
    expect(values('p0: 5, p90: 50')[0].error).toBeTruthy();
    expect(values('p10: 5, p100: 50')[0].error).toBeTruthy();
  });

  it('the two percentiles must differ', () => {
    expect(values('p50: 5, p50: 50')[0].error).toBeTruthy();
  });
});
