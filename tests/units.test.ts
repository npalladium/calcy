import { describe, expect, it } from 'vitest';
import { buildUnitTable, DEFAULT_UNITS, isUnit, lookupUnit } from '../src/lib/engine/units';
import { num, text } from './helpers';

describe('exact conversions', () => {
  it.each([
    ['1 km in m', 1000],
    ['1000 m in km', 1],
    ['1 mi in km', 1.609344],
    ['1 h in s', 3600],
    ['1 day in h', 24],
    ['1 week in day', 7],
    ['1 min in s', 60],
    ['1 GB in MB', 1000],
    ['1 MB in KB', 1000],
    ['1 byte in bit', 8],
    ['1 KiB in byte', 1024],
    ['1 MiB in KiB', 1024],
    ['1 kW in W', 1000],
    ['1 kWh in J', 3.6e6]
  ])('%s = %d', (q, expected) => {
    // display carries ~3 sig figs, so compare with a relative tolerance
    expect(Math.abs(num(q) - expected) / expected).toBeLessThan(0.005);
  });
});

describe('labels survive arithmetic', () => {
  it('counts keep their name', () => {
    expect(text('5 req')).toBe('5 req');
    // the display echoes the unit as typed (issue #1), so the plural survives
    expect(text('100 events')).toBe('100 events');
    expect(num('1 req in req')).toBe(1);
  });
  it('currency is its own dimension', () => {
    expect(text('5 $')).toBe('$5.00');
    expect(text('5 dollars')).toBe('$5.00');
    expect(num('100 cents in $')).toBeCloseTo(1, 9);
  });
});

describe('month/year are explicit and toggleable (§1.6)', () => {
  it('defaults to average Gregorian month / Julian year', () => {
    // Defaults: month = 365.25/12 ≈ 30.436875, year = 365.25 (average Gregorian
    // year). The 30.4 toBeCloseTo allows the trailing decimals; the year is
    // exact so toBe is fine.
    expect(num('1 month in day')).toBeCloseTo(30.4, 1);
    expect(num('1 year in day')).toBe(365.25);
  });
  it('honours a 30-day month / 365-day year override', () => {
    expect(num('1 month in day', { monthDays: 30 })).toBe(30);
    expect(num('1 year in day', { yearDays: 365 })).toBe(365);
  });
});

describe('dimensional safety on conversion', () => {
  it('rejects incompatible target units', () => {
    const r = text('5 km in s');
    expect(r).toBeUndefined();
  });
});

describe('unit table internals', () => {
  it('lookupUnit returns dim + scale; isUnit is a membership test', () => {
    expect(lookupUnit(DEFAULT_UNITS, 'km')).toEqual({ dim: { length: 1 }, scale: 1000 });
    expect(lookupUnit(DEFAULT_UNITS, 'B')).toEqual({ dim: { data: 1 }, scale: 8 });
    expect(lookupUnit(DEFAULT_UNITS, 'nope')).toBeUndefined();
    expect(isUnit(DEFAULT_UNITS, 'req')).toBe(true);
    expect(isUnit(DEFAULT_UNITS, 'zzz')).toBe(false);
  });
  it('month scale reflects the configured convention', () => {
    expect(lookupUnit(buildUnitTable({ monthDays: 30 }), 'month')?.scale).toBe(30 * 86400);
    expect(lookupUnit(buildUnitTable(), 'month')?.scale).toBeCloseTo(30.436875 * 86400, 3);
  });
});
