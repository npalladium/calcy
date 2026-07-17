import { describe, expect, it } from 'vitest';
import { DEFAULT_UNITS } from '../src/lib/engine/units';
import { num } from './helpers';

// Percentage-point unit (pp): an ordinary dimensionless scale unit, 1 pp =
// 0.01, mirroring percent/permille/ppm/pphm/ppb/ppt (§4 ratios section).
// Useful for additive percentage-point math (`50% + 5 pp`), which is
// distinct from relative-percent math (`50% * 1.05`).

describe('pp (percentage points) is a dimensionless scale', () => {
  it('5 pp is 0.05', () => {
    expect(num('5 pp')).toBeCloseTo(0.05, 12);
  });

  it('is dimensionless', () => {
    expect(DEFAULT_UNITS.get('pp')?.dim).toEqual({});
  });

  it('composes with arithmetic (5 pp + 5 pp = 0.10)', () => {
    expect(num('5 pp + 5 pp')).toBeCloseTo(0.1, 12);
  });

  it('converts to/from percent (10 pp in % = 10)', () => {
    expect(num('10 pp in %')).toBeCloseTo(10, 9);
  });

  it('interoperates additively with percent (50% + 5 pp = 0.55)', () => {
    expect(num('50% + 5 pp')).toBeCloseTo(0.55, 12);
  });
});
