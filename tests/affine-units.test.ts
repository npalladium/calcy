import { describe, expect, it } from 'vitest';
import { num } from './helpers';

// ChemE proposal, Primitive A — phase 1: affine (offset) units, conversion-only.
//
// `20 °C` eagerly becomes 293.15 K (an absolute temperature in base units), so
// ordinary base-unit arithmetic already produces the right numbers. Conversion
// `T in °C/°F` undoes the offset. Delta units (Cdeg/Δ°C, Fdeg/Δ°F) are plain
// multiplicative units. Phase 2 adds the absolute-vs-difference model.

describe('absolute temperature conversion', () => {
  it('°C ↔ K applies the 273.15 offset', () => {
    expect(num('0 °C in K')).toBeCloseTo(273.15, 6);
    expect(num('300 K in °C')).toBeCloseTo(26.85, 6);
  });

  it('°C ↔ °F applies the scale and offset', () => {
    expect(num('20 °C in °F')).toBeCloseTo(68, 6);
    expect(num('100 °C in °F')).toBeCloseTo(212, 6);
    expect(num('32 °F in °C')).toBeCloseTo(0, 6);
    expect(num('98.6 °F in °C')).toBeCloseTo(37, 6);
  });

  it('round-trips through the other scale', () => {
    expect(num('37 °C in °F in °C')).toBeCloseTo(37, 6);
  });

  it('ASCII aliases work (degC, celsius, fahrenheit)', () => {
    expect(num('25 degC in K')).toBeCloseTo(298.15, 6);
    expect(num('25 celsius in fahrenheit')).toBeCloseTo(77, 6);
  });
});

describe('gauge vs absolute pressure', () => {
  it('barg adds one atmosphere', () => {
    expect(num('2 barg in bar')).toBeCloseTo(3.01325, 4);
    expect(num('0 barg in kPa')).toBeCloseTo(101.325, 3);
  });

  it('psig adds one atmosphere', () => {
    expect(num('0 psig in kPa')).toBeCloseTo(101.325, 2);
  });
});

describe('delta (difference) units are plain multiplicative units', () => {
  it('Cdeg is a kelvin-sized step', () => {
    expect(num('5 Cdeg in K')).toBe(5);
    expect(num('10 Δ°C in Δ°F')).toBeCloseTo(18, 6);
  });

  it('Fdeg is a 5/9-kelvin step', () => {
    expect(num('9 Fdeg in K')).toBeCloseTo(5, 6);
  });
});

describe('base-K arithmetic flows through °C (phase-1 behaviour)', () => {
  it('subtracting two absolute temps gives a kelvin difference', () => {
    // (30 °C − 20 °C) = 10 K; in phase 1 the result is a plain K value.
    expect(num('30 °C - 20 °C in K')).toBeCloseTo(10, 6);
  });
});
