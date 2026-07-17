import { describe, expect, it } from 'vitest';
import { num, values } from './helpers';

// round(x, digits?): optional decimal-places argument. 1-arg form (nearest
// integer) is unchanged; the 2-arg form rounds to `digits` decimal places
// (negative allowed), elementwise on distributions, preserving x's dimension.

describe('round(x, digits?)', () => {
  it('1-arg form is unchanged (nearest integer)', () => {
    expect(num('round(2.5)')).toBe(3);
  });

  it('rounds to a positive number of decimal places', () => {
    expect(num('round(3.14159, 2)')).toBeCloseTo(3.14, 10);
  });

  it('rounds to a negative number of decimal places', () => {
    expect(num('round(1234.5, -1)')).toBe(1230);
  });

  it('preserves the dimension of x', () => {
    expect(num('round(3.14159 m, 1)')).toBeCloseTo(3.1, 10);
    expect(values('round(3.14159 m, 1)')[0].display?.unit).toBe('m');
  });

  it('rejects a non-dimensionless digits argument', () => {
    expect(values('round(3.14159, 2 m)')[0].error).toBeTruthy();
  });

  it('rejects a non-deterministic digits argument', () => {
    expect(values('round(3.14159, (1 to 3))')[0].error).toBeTruthy();
  });

  it('maps per-sample over a distribution', () => {
    const s = values('round((1 to 3), 1)', { N: 4000, seed: 3 })[0].summary;
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(Number.isFinite(s.p50)).toBe(true);
    // rounded to 1 decimal place: ×10 should land on (near) an integer
    expect(Math.abs(s.p50 * 10 - Math.round(s.p50 * 10))).toBeLessThan(1e-9);
  });
});
