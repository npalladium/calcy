import { describe, expect, it } from 'vitest';
import { values } from './helpers';

// skew(d) — is risk skewed to the upside or downside? Exposes the asymmetry the
// engine already computes internally for tail-aware formatting. Analytic
// (third standardized moment) for known families; sample skewness otherwise.
// Skew is a pure number, so the result is always dimensionless.
const STAT = { N: 60000, seed: 7 };

const val = (src: string, opts = STAT): number => {
  const l = values(src, opts)[0];
  if (l.error) throw new Error(`${src} → ${l.error}`);
  return Number(l.display?.value);
};

describe('skew(d)', () => {
  it('symmetric families have zero skew', () => {
    expect(val('skew(normal(100, 15))')).toBeCloseTo(0, 9);
    expect(val('skew(uniform(0, 10))')).toBeCloseTo(0, 9);
  });

  it('exponential skew is exactly 2', () => {
    expect(val('skew(exponential(5))')).toBeCloseTo(2, 9);
  });

  it('poisson skew is 1/√λ', () => {
    expect(val('skew(poisson(4))')).toBeCloseTo(0.5, 9);
  });

  it('binomial skew is (1−2p)/√(n·p·(1−p))', () => {
    // n = 100, p = 0.02 → 0.96 / √1.96 = 0.685714
    expect(val('skew(binomial(100, 0.02))')).toBeCloseTo(0.685714, 6);
  });

  it('beta skew is 2(β−α)√(α+β+1) / ((α+β+2)√(αβ))', () => {
    // beta(2, 5) → 2·3·√8 / (9·√10) = 0.596285
    expect(val('skew(beta(2, 5))')).toBeCloseTo(0.596285, 6);
  });

  it('lognormal is strongly right-skewed', () => {
    // 1 to 100 at 90%: σ = 1.399567 → skew = (e^{σ²}+2)·√(e^{σ²}−1) ≈ 22.4
    expect(val('skew(1 to 100)')).toBeGreaterThan(15);
  });

  it('is dimensionless regardless of the input units', () => {
    expect(values('skew(exponential(5 day))', STAT)[0].display?.unit).toBe('');
  });

  it('a scalar has zero skew', () => {
    expect(val('skew(42 day)')).toBe(0);
  });

  it('falls back to sample skewness for families with no analytic form', () => {
    // weibull(2, 10): true skew ≈ 0.631; sample estimate lands near it.
    const s = val('skew(weibull(2, 10))');
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThan(0.85);
  });

  it('rejects a list', () => {
    expect(values('skew([1, 2, 3])')[0].error).toMatch(/distribution|list/);
  });
});
