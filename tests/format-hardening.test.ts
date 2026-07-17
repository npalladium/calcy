import { describe, expect, it } from 'vitest';
import { formatNumber, formatSummary } from '../src/lib/engine/format';
import type { PointSummary } from '../src/lib/engine/mc';
import { relativeTime } from '../src/lib/sheet/time';
import { tapePrefix } from '../src/lib/tape';

describe('formatNumber near the 10^15 boundary', () => {
  // Just below 1e15, float log10 rounds up to 15 and the tier index ran past
  // the suffix table, rendering "1undefined". It must produce a real string.
  it.each([999999999999999, 999999999999998])('renders %d without "undefined"', (n) => {
    for (const fmt of ['auto', 'compact', 'newspaper', 'scientific'] as const) {
      const s = formatNumber(n, fmt);
      expect(s).not.toContain('undefined');
    }
  });

  it('values at/above 1e15 use scientific', () => {
    expect(formatNumber(1e15)).toContain('e');
  });
});

const money = (value: number): string => {
  const summary: PointSummary = { kind: 'point', value, dim: { usd: 1 } };
  return formatSummary(summary).text;
};

describe('formatMoney handles non-finite values', () => {
  it('NaN renders as NaN, not -∞', () => {
    expect(money(NaN)).toBe('NaN');
  });
  it('-Infinity puts the sign before the symbol', () => {
    expect(money(-Infinity)).toBe('-$∞');
  });
  it('+Infinity keeps the symbol first', () => {
    expect(money(Infinity)).toBe('$∞');
  });
  it('ordinary money is unaffected', () => {
    expect(money(-5)).toBe('-$5.00');
  });
});

describe('relativeTime handles future timestamps', () => {
  const now = 1_000_000_000_000;
  it('a few minutes in the future is not "just now"', () => {
    expect(relativeTime(now + 5 * 60_000, now)).toBe('in 5m');
  });
  it('days in the future read "in Nd", never a negative count', () => {
    const s = relativeTime(now + 5 * 86_400_000, now);
    expect(s).toBe('in 5d');
    expect(s).not.toContain('-');
  });
  it('past times are unchanged', () => {
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5m ago');
  });
});

describe('tapePrefix tolerates empty / out-of-range input', () => {
  it('an empty tape yields (0) instead of throwing', () => {
    expect(tapePrefix([], 0)).toBe('(0)');
  });
  it('an out-of-range upto stops at the last row', () => {
    expect(tapePrefix([{ op: '=', operand: '5' }], 9)).toBe('(5)');
  });
});
