import { describe, expect, it } from 'vitest';
import { num, one } from './helpers';

// INR (Indian rupee) as a built-in currency — its own base dimension, like
// USD/EUR/GBP/JPY. The ₹ glyph works both postfix and as a prefix (the §2 fix).

describe('INR built-in currency', () => {
  it('accepts ₹, INR, and rupee spellings', () => {
    expect(num('100 INR in INR')).toBe(100);
    expect(num('100 rupees in INR')).toBe(100);
    expect(num('₹100 in INR')).toBe(100);
  });

  it('formats as money with the ₹ symbol', () => {
    expect(one('₹100').display?.text).toBe('₹100.00');
    expect(one('100 INR').display?.text).toBe('₹100.00');
    expect(one('₹2500000').display?.text).toBe('₹2,500,000.00');
  });

  it('is its own dimension — not mixable with other currencies', () => {
    expect(one('₹100 + $1').error).toBeTruthy();
  });
});

describe('INR FX conversion via bridge', () => {
  it('converts ₹ → $ and back through one rate', () => {
    expect(num('bridge fx = 83 ₹/$\n8300 INR in $ via fx')).toBeCloseTo(100, 6);
    expect(num('bridge fx = 83 ₹/$\n100 $ in INR via fx')).toBeCloseTo(8300, 6);
  });
});
