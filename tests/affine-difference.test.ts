import { describe, expect, it } from 'vitest';
import { num, one, values } from './helpers';

// ChemE proposal, Primitive A — phase 2: the absolute-vs-difference model.
//
// A temperature value is tagged `abs` (from an absolute unit °C/°F) or `diff`
// (from a delta unit Cdeg/Δ°C, or from subtracting two absolutes). The tag only
// rides on tagged values, so plain K/Pa arithmetic is unchanged. Conversion of a
// difference drops the offset, so `(20°C − 10°C) in °F` is 18, not −441.

describe('subtracting absolutes yields a difference', () => {
  it('a difference converts without the offset', () => {
    expect(num('(20 °C - 10 °C) in °F')).toBeCloseTo(18, 6); // 10 K · 9/5
    expect(num('(20 °C - 10 °C) in °C')).toBeCloseTo(10, 6);
    expect(num('(100 °C - 0 °C) in Δ°F')).toBeCloseTo(180, 6);
    expect(num('(20 °C - 10 °C) in K')).toBeCloseTo(10, 6);
  });
});

describe('adding/subtracting absolutes and differences', () => {
  it('absolute + difference stays absolute', () => {
    expect(num('20 °C + 5 Cdeg in °C')).toBeCloseTo(25, 6);
    expect(num('20 °C - 5 Cdeg in °C')).toBeCloseTo(15, 6);
  });

  it('a bare kelvin increment is treated as a difference when added to °C', () => {
    expect(num('20 °C + 5 K in °C')).toBeCloseTo(25, 6);
  });

  it('adding two absolute temperatures is an error', () => {
    expect(values('20 °C + 10 °C')[0].error).toMatch(/absolute/i);
  });

  it('difference ± difference is a difference', () => {
    expect(num('(5 Cdeg + 3 Cdeg) in Cdeg')).toBeCloseTo(8, 6);
  });

  it('adding a temperature to a length still errors on dimensions', () => {
    expect(values('20 °C + 5 m')[0].error).toMatch(/incompatible|dimension/i);
  });
});

describe('scaling differences', () => {
  it('a scalar times a difference is a difference', () => {
    expect(num('2 * 5 Cdeg in Cdeg')).toBeCloseTo(10, 6);
  });
});

describe('differences flow through composite arithmetic (heat duty)', () => {
  it('Q = mdot · Cp · ΔT', () => {
    // 2 kg/s · 4 kJ/(kg·K) · (40−20=20 K) = 160 kW. Read the final line.
    const ls = values(
      'mdot = 2 kg/s\nCp = 4 kJ/(kg K)\ndT = (40 °C - 20 °C)\nmdot * Cp * dT in kW'
    );
    expect(Number(ls[ls.length - 1].display?.value)).toBeCloseTo(160, 4);
  });
});

describe('distribution × affine unit', () => {
  it('(20 to 30) °C is an absolute-temperature distribution', () => {
    // summary is raw base K (~298); the °C value is in the converted display.
    const d = one('(20 to 30) °C in °C').display;
    expect(d?.kind).toBe('dist');
    const p50 = Number(d?.p50);
    expect(p50).toBeGreaterThan(23);
    expect(p50).toBeLessThan(27);
  });
});

describe('plain kelvin arithmetic is unchanged (no regression)', () => {
  it('K − K and K + K behave as before (no tag, no error)', () => {
    expect(num('300 K - 280 K in K')).toBeCloseTo(20, 6);
    expect(num('300 K + 280 K in K')).toBeCloseTo(580, 6); // not an error
  });
});
