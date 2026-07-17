import { describe, expect, it } from 'vitest';
import { correlation } from '../src/lib/engine/stats';

const f = (...xs: number[]) => Float64Array.from(xs);

describe('correlation', () => {
  it('is 1 for perfectly correlated data', () => {
    expect(correlation(f(1, 2, 3), f(1, 2, 3))).toBeCloseTo(1, 9);
    expect(correlation(f(1, 2, 3, 4), f(10, 20, 30, 40))).toBeCloseTo(1, 9);
  });

  it('is -1 for perfectly anti-correlated data', () => {
    expect(correlation(f(1, 2, 3), f(3, 2, 1))).toBeCloseTo(-1, 9);
  });

  it('is 0 when one series has no variance', () => {
    expect(correlation(f(1, 1, 1), f(1, 2, 3))).toBe(0);
  });

  it('handles a known intermediate case', () => {
    // cov/(sx*sy) for these is 0.5
    expect(correlation(f(1, 2, 3, 4), f(1, 3, 2, 4))).toBeCloseTo(0.8, 6);
  });
});
