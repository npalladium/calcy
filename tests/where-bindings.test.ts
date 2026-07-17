import { describe, expect, it } from 'vitest';
import { num, one, values } from './helpers';

// Syntax proposal §7 — inline `where` bindings.
//
// `expr where a = …, b = …` evaluates `expr` with the extra locals bound, kept
// to that one line. Useful for one-off scenarios without scattering assignment
// lines above. Bindings are evaluated in order (later ones may reference earlier
// ones and the surrounding sheet) and do not leak into the sheet.

describe('where bindings', () => {
  it('binds simple locals', () => {
    expect(num('price * qty where price = 10, qty = 5')).toBe(50);
  });

  it('a later binding can reference an earlier one', () => {
    expect(num('a * b where a = 2, b = a + 3')).toBe(10); // b = 5
  });

  it('a binding can reference a sheet variable', () => {
    expect(num('base = 100\nbase * f where f = 2')).toBe(100); // line 0 = base
    expect(Number(values('base = 100\nbase * f where f = 2')[1].display?.value)).toBe(200);
  });

  it('works on an assignment RHS', () => {
    expect(Number(values('r = a + b where a = 1, b = 2\nr')[1].display?.value)).toBe(3);
  });

  it('supports distribution-valued bindings', () => {
    const s = one('price * qty where price = 10 to 20, qty = 100').summary;
    expect(s?.kind).toBe('dist');
  });

  it('locals do not leak into later sheet lines', () => {
    const ls = values('5 * k where k = 2\nk');
    expect(Number(ls[0].display?.value)).toBe(10);
    expect(ls[1].error).toBeTruthy(); // k is not defined at sheet scope
  });
});
