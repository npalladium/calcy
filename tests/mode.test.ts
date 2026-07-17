import { describe, expect, it } from 'vitest';
import { values } from './helpers';

// mode(d) — the peak of a distribution. For skewed families (lognormal) it's
// the honest "most likely" value the mean/median hide. Analytic when the
// distribution carries a parametric identity; a smoothed histogram-peak
// estimate otherwise.
const STAT = { N: 40000, seed: 7 };

// Read the pinned display value (honours a trailing `in <unit>`); machine-
// parseable, unlike the rounded `text`.
const exact = (src: string, opts = STAT): number => {
  const l = values(src, opts)[0];
  if (l.error) throw new Error(`${src} → ${l.error}`);
  if (l.summary?.kind !== 'point') throw new Error(`expected point for: ${src}`);
  return Number(l.display?.value);
};

describe('mode(d)', () => {
  it('normal mode is the mean', () => {
    expect(exact('mode(normal(100, 15))')).toBeCloseTo(100, 9);
  });

  it('lognormal mode is exp(μ − σ²), below the median', () => {
    // 1 to 100 at 90%: μ = ln10 = 2.302585, σ = ln100/(2·1.644854) = 1.399567
    // mode = exp(2.302585 − 1.958788) = 1.41029
    expect(exact('mode(1 to 100)')).toBeCloseTo(1.41029, 3);
  });

  it('binomial mode is ⌊(n+1)p⌋', () => {
    expect(exact('mode(binomial(100, 0.02))')).toBe(2);
  });

  it('weibull mode is λ·((k−1)/k)^(1/k) for k > 1, else 0', () => {
    // k = 2, λ = 10 → 10·(0.5)^0.5 = 7.07107
    expect(exact('mode(weibull(2, 10))')).toBeCloseTo(7.07107, 3);
    // k < 1 → the density peaks at 0
    expect(exact('mode(weibull(0.8, 10))')).toBe(0);
  });

  it('triangular/pert mode is the most-likely param', () => {
    // Construct with unit'd args so the parametric meta survives (a `* day`
    // multiply drops it for non-normal/lognormal families).
    expect(exact('mode(triangular(2 day, 3 day, 8 day)) in day')).toBeCloseTo(3, 6);
    expect(exact('mode(pert(2 day, 3 day, 8 day)) in day')).toBeCloseTo(3, 6);
  });

  it('a scalar is its own mode', () => {
    expect(exact('mode(42 day) in day')).toBeCloseTo(42, 9);
  });

  it('falls back to a sample estimate for families with no analytic mode', () => {
    // uniform(0, 10): flat, so the estimate just has to land inside the support.
    const m = exact('mode(uniform(0, 10))');
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(10);
  });

  it('rejects a list (mode is for distributions)', () => {
    expect(values('mode([1, 2, 3])')[0].error).toMatch(/distribution|list/);
  });
});
