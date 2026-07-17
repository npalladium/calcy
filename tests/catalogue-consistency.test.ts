import { describe, expect, it } from 'vitest';
import { evalRoot } from '../src/lib/engine/eval';
import { buildUnitTable } from '../src/lib/engine/units';
import { dimToString } from '../src/lib/engine/value';
import { makeCtx, parse, seededFns } from './helpers';

// Whole-catalogue consistency for the ~400-entry unit table.
//
// Most of these checks need NO external oracle — they assert the table is
// internally coherent (well-formed entries, exact SI-prefix decades) and that
// the conversion pipeline round-trips. A small curated block cross-checks a
// handful of definitional constants against their SI/NIST values, which is the
// only thing that can catch a single mistyped scale.

const TABLE = buildUnitTable();

// Convert `n unitA` into `unitB`, returning the full-precision magnitude
// (bypassing the display formatter, which rounds).
function convert(src: string): number {
  const { value, pinned } = evalRoot(parse(src), makeCtx(seededFns(1, 1)));
  if (value.scalar == null || !pinned) throw new Error(`not a scalar conversion: ${src}`);
  // Mirror the display path: affine units (°C/°F/barg) undo the offset, and log
  // units (dB/dBm/dBW) undo the log.
  if (pinned.log) return pinned.log.factor * Math.log10(value.scalar / pinned.log.ref);
  return (value.scalar - (pinned.offset ?? 0)) / pinned.factor;
}

describe('every catalogue entry is well-formed', () => {
  it('scale is finite and non-zero; exponents are finite integers', () => {
    for (const [name, def] of TABLE) {
      expect(Number.isFinite(def.scale), `${name} scale ${def.scale}`).toBe(true);
      expect(def.scale, `${name} scale is zero`).not.toBe(0);
      for (const [base, exp] of Object.entries(def.dim)) {
        expect(Number.isFinite(exp), `${name}.${base} exp ${exp}`).toBe(true);
        expect(Number.isInteger(exp), `${name}.${base} exp not integer: ${exp}`).toBe(true);
        expect(exp, `${name}.${base} exp is zero (should be omitted)`).not.toBe(0);
      }
    }
  });
});

describe('SI prefixes are exact decades of the base unit', () => {
  // 1 <prefix><unit> must equal exactly 10^k <unit>. Reading scales straight
  // from the table keeps this at full float precision.
  const CASES: [string, string, number][] = [
    ['km', 'm', 1e3],
    ['cm', 'm', 1e-2],
    ['mm', 'm', 1e-3],
    ['Mm', 'm', 1e6],
    ['nm', 'm', 1e-9],
    ['kL', 'L', 1e3],
    ['mL', 'L', 1e-3],
    ['keV', 'eV', 1e3]
  ];
  for (const [prefixed, base, ratio] of CASES) {
    it(`1 ${prefixed} = ${ratio} ${base}`, () => {
      const a = TABLE.get(prefixed);
      const b = TABLE.get(base);
      if (!a || !b) throw new Error(`missing ${prefixed} or ${base}`);
      expect(a.scale / b.scale).toBeCloseTo(ratio, 12);
      expect(dimToString(a.dim)).toBe(dimToString(b.dim));
    });
  }
});

describe('curated reference conversions match their definitional/SI values', () => {
  // Each scale is "1 unit = N canonical base units". Definitional (exact) or
  // CODATA/NIST values. A single mistyped digit in units.ts fails here.
  const REFERENCE: Record<string, number> = {
    // length (m)
    mi: 1609.344,
    ft: 0.3048,
    inch: 0.0254,
    yd: 0.9144,
    nmi: 1852,
    // time (s)
    min: 60,
    h: 3600,
    day: 86400,
    week: 604800,
    // mass (kg)
    lb: 0.45359237,
    oz: 0.028349523125,
    // volume (m³)
    L: 1e-3,
    gal: 0.003785411784,
    // pressure (Pa)
    atm: 101325,
    bar: 1e5,
    psi: 6894.757293168,
    // energy (J)
    cal: 4.184,
    kWh: 3.6e6,
    BTU: 1055.05585262,
    // power (W)
    hp: 745.6998715822702
  };
  for (const [name, scale] of Object.entries(REFERENCE)) {
    it(`1 ${name} = ${scale} base`, () => {
      const def = TABLE.get(name);
      if (!def) throw new Error(`missing unit ${name}`);
      // Relative agreement to ~13 significant figures.
      expect(Math.abs(def.scale - scale) / scale).toBeLessThan(1e-13);
    });
  }
});

describe('conversion round-trips across the whole identifier-safe catalogue', () => {
  // Group every safe-named unit by its dimension, then round-trip each unit
  // through its group representative: `1 u in rep in u` must return 1. This
  // exercises the full parse→eval→convert pipeline and would surface any
  // degenerate (NaN/0/∞) entry as a failed round-trip.
  const RESERVED = new Set([
    'in',
    'to',
    'per',
    'and',
    'between',
    'about',
    'of',
    'step',
    'seen',
    'given',
    'every'
  ]);
  const safe = [...TABLE.keys()].filter(
    (n) => /^[A-Za-z][A-Za-z0-9]*$/.test(n) && !RESERVED.has(n)
  );

  const groups = new Map<string, string[]>();
  for (const name of safe) {
    const def = TABLE.get(name);
    if (!def) continue;
    const key = dimToString(def.dim);
    const arr = groups.get(key);
    if (arr) arr.push(name);
    else groups.set(key, [name]);
  }

  it(`round-trips every safe unit (${safe.length} units across ${groups.size} dimensions)`, () => {
    let checked = 0;
    for (const [, names] of groups) {
      const rep = names[0];
      for (const u of names) {
        const there = convert(`1 ${u} in ${rep}`);
        const back = convert(`${there} ${rep} in ${u}`);
        expect(Number.isFinite(back), `${u} round-trip produced ${back}`).toBe(true);
        expect(Math.abs(back - 1)).toBeLessThan(1e-9);
        checked++;
      }
    }
    expect(checked).toBe(safe.length);
  });
});
