import { describe, expect, it } from 'vitest';
import { num, one } from './helpers';

// Syntax proposal §4 (Option F) — `to` is confidence-interval ONLY, `in` is
// conversion ONLY. This removes the `to`-site lookahead entirely: `to` always
// builds a CI, `in` always converts. Fully breaking — `5 km to mi` is no longer
// a conversion (it's a CI between 5 km and 1 mi).

describe('`in` is the only conversion keyword', () => {
  it('converts with in', () => {
    expect(num('1 km in m')).toBe(1000);
    expect(num('1.2 GB in MB')).toBe(1200);
    expect(num('90 km/h in m/s')).toBeCloseTo(25, 6);
  });
});

describe('`to` is the only CI keyword', () => {
  it('two bare numbers build a CI', () => {
    expect(one('800 to 1200').summary?.kind).toBe('dist');
  });

  it('a trailing unit distributes over a numeric CI', () => {
    expect(one('2 to 4 day').summary?.kind).toBe('dist');
    // `in` still pins the display unit of a CI distribution
    expect(one('(2 to 4) day in day').display?.unit).toBe('day');
  });

  it('an ascending two-bound interval with units is a CI', () => {
    // `1 mi to 5 km` (1609 m … 5000 m) is well-ordered → a distribution.
    expect(one('1 mi to 5 km').summary?.kind).toBe('dist');
  });
});

describe('no more lookahead: `to` never converts (and reversed bounds are caught)', () => {
  it('`to` followed by a bare unit is rejected as a likely conversion mistake', () => {
    // `5 km to mi` would be a CI between 5 km and 1 mi — reversed (5000 > 1609),
    // almost always a `to`-as-conversion slip. Usability fix #1 rejects it and
    // points at `in`. See tests/to-conversion-guard.test.ts.
    const r = one('5 km to mi');
    expect(r.error).toBeTruthy();
    expect(r.errorHint ?? r.error ?? '').toMatch(/convert|in /i);
  });

  it('`1 km to m` (reversed) errors instead of silently making a CI', () => {
    expect(one('1 km to m').error).toBeTruthy();
  });
});
