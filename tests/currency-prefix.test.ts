import { describe, expect, it } from 'vitest';
import { num, one } from './helpers';

// Usability fix #2 — currency symbols read as a prefix. Everyone writes `$5`,
// but the tokenizer used to swallow `$5` as a single identifier. A currency glyph
// immediately followed by a digit (or `.`) now lexes as the unit times the number.

describe('currency prefix notation', () => {
  it('`$5` equals `5 $`', () => {
    expect(num('$5')).toBe(num('5 $'));
    expect(num('$5')).toBe(5);
  });

  it('formats as money', () => {
    expect(one('$5').display?.text).toBe('$5.00');
    expect(one('$1000000').display?.text).toBe('$1,000,000.00');
  });

  it('works in arithmetic', () => {
    expect(num('$5 + $10 in $')).toBe(15);
    expect(num('$2.50 * 4 in $')).toBe(10);
  });

  it('other currency glyphs prefix too', () => {
    expect(one('€20').display?.text).toBe('€20.00');
    expect(one('£5').display?.text).toBe('£5.00');
    expect(num('¥100 in ¥')).toBe(100);
  });

  it('decimals after the glyph are kept', () => {
    expect(num('$5.50')).toBe(5.5);
  });
});

describe('postfix and compound forms still work', () => {
  it('postfix `5 $` is unchanged', () => {
    expect(one('5 $').display?.text).toBe('$5.00');
  });

  it('`k$` (kilo-dollar unit) is not mistaken for a prefix', () => {
    expect(num('2 k$ in $')).toBe(2000);
  });

  it('a glyph followed by a letter stays one identifier (no false split)', () => {
    // `$x` is still a single (unknown) identifier, not `$ * x`.
    expect(one('$x').error).toBeTruthy();
  });
});
