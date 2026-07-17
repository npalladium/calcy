import { describe, expect, it } from 'vitest';
import { num, one, values } from './helpers';

// Syntax proposal §1 — generalised numeric magnitude suffixes.
//
// `k`/`K` (×10³) already exist. This adds uppercase `M` (×10⁶) so users can
// write `1.2M` for a million. The suffix is consumed ONLY when the next char is
// not an identifier part, so unit names that begin with the suffix letter are
// untouched (`12MB` = 12 megabytes, `12kg` = 12 kilograms).
//
// `T` and `B` are deliberately NOT suffixes: `T` is Tesla and `B` would collide
// with byte/bel. Lowercase `m` is the metre, so only uppercase `M` is million.

describe('numeric magnitude suffixes', () => {
  it('k/K mean ×1000 (existing behaviour, pinned)', () => {
    expect(num('12k')).toBe(12000);
    expect(num('12K')).toBe(12000);
    expect(num('800k')).toBe(800000);
    expect(num('1.2k')).toBe(1200);
  });

  it('M means ×1,000,000', () => {
    expect(num('1.2M')).toBe(1.2e6);
    expect(num('12M')).toBe(12e6);
    expect(num('3M')).toBe(3e6);
  });

  it('a suffix carries into a following unit', () => {
    expect(num('5k req')).toBe(5000);
    expect(num('2M req')).toBe(2e6);
  });

  it('does not eat a unit that starts with the suffix letter', () => {
    // `12kg` is 12 kilograms, not 12000 g; `12MB` is 12 megabytes (not 12e6·B).
    expect(one('12kg').display?.text).toBe('12 kg');
    expect(num('12MB in MB')).toBe(12);
  });

  it('does not shadow units T (Tesla) and B with magnitude suffixes', () => {
    // `3T` must stay 3 Tesla (a dimensioned value), never 3e12 dimensionless.
    const t = one('3T').display;
    expect(t?.unit).toBeTruthy(); // has a physical unit → still Tesla
    expect(Number(t?.value)).toBe(3);
  });

  it('a digit immediately after a suffix is still rejected (no silent merge)', () => {
    // `12M5` is ambiguous garbage — it must error, not silently become 12000005.
    expect(values('12M5')[0].error).toBeTruthy();
  });
});
