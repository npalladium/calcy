import { describe, expect, it } from 'vitest';
import { num, one, values } from './helpers';

// ChemE proposal, Primitive C — dimensional bridges.
//
// `bridge water = 18.015 g/mol` declares a cross-dimension equivalence; then
// `100 g in mol via water` converts across the mass⇄amount gap, picking
// multiply-or-divide automatically. The same primitive covers density
// (mass⇄volume), price (count⇄currency), etc. (The bridge line is a directive,
// so it produces no value — values()[0] is the conversion line.)

describe('molar-mass bridge (mass ⇄ amount)', () => {
  it('converts mass to moles (divide)', () => {
    expect(num('bridge water = 18.015 g/mol\n100 g in mol via water')).toBeCloseTo(5.5509, 3);
  });

  it('converts moles to mass (multiply)', () => {
    expect(num('bridge water = 18.015 g/mol\n2 mol in g via water')).toBeCloseTo(36.03, 2);
  });

  it('pins the target unit', () => {
    expect(one('bridge water = 18.015 g/mol\n100 g in mol via water').display?.unit).toBe('mol');
  });

  it('round-trips back to the source', () => {
    expect(num('bridge water = 18.015 g/mol\n100 g in mol via water in g via water')).toBeCloseTo(
      100,
      6
    );
  });
});

describe('the same primitive serves other domains', () => {
  it('density bridges mass ⇄ volume', () => {
    // 5 kg / 2700 kg/m³ = 1.852 L
    expect(num('bridge rock = 2700 kg/m^3\n5 kg in L via rock')).toBeCloseTo(1.852, 2);
  });

  it('price bridges count ⇄ currency', () => {
    expect(num('bridge widget = 3 $/count\n12 count in $ via widget')).toBeCloseTo(36, 6);
  });
});

describe('bridges propagate uncertainty', () => {
  it('a distribution converts through a bridge', () => {
    const s = one('bridge water = 18.015 g/mol\n(90 to 110) g in mol via water').summary;
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(s.p50).toBeGreaterThan(4.8);
    expect(s.p50).toBeLessThan(6.2);
  });
});

describe('bridge errors', () => {
  it('unknown bridge name', () => {
    expect(values('5 kg in L via nope')[0].error).toMatch(/bridge|nope/i);
  });

  it('a bridge that cannot reconcile the dimensions', () => {
    expect(values('bridge water = 18.015 g/mol\n5 s in mol via water')[0].error).toBeTruthy();
  });
});
