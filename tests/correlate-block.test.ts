import { describe, expect, it } from 'vitest';
import type { Summary } from '../src/lib/engine/mc';
import { lines } from './helpers';

// The `correlate:` block: define two or more independent distributions and
// couple them pairwise with `cor(a, b) = r`, preserving each marginal exactly.
// Members leak to the sheet, so downstream lines see the coupled arrays via the
// engine's correlation-by-reuse.

const BIG = { N: 40000, seed: 7, numberFormat: 'scientific' as const };

// sd of a `dist` result line, by variable name.
function sdOf(text: string, name: string): number {
  const l = lines(text, BIG).find((r) => r.name === name);
  if (!l?.summary || l.summary.kind !== 'dist') throw new Error(`no dist line '${name}'`);
  return (l.summary as Extract<Summary, { kind: 'dist' }>).sd;
}
function meanOf(text: string, name: string): number {
  const l = lines(text, BIG).find((r) => r.name === name);
  if (!l?.summary || l.summary.kind !== 'dist') throw new Error(`no dist line '${name}'`);
  return (l.summary as Extract<Summary, { kind: 'dist' }>).mean;
}

describe('correlate: block — coupling', () => {
  // For standard normals a and b, sd(a+b) = √(2(1+r)): √2≈1.414 independent,
  // √3.6≈1.897 at r=0.8, √0.4≈0.632 at r=-0.8. The sum's spread is the
  // end-to-end evidence the members were jointly reordered and leaked.
  it('induces positive coupling visible downstream', () => {
    const sheet = [
      'correlate:',
      '  a = normal(0, 1)',
      '  b = normal(0, 1)',
      '  cor(a, b) = 0.8',
      'both = a + b'
    ].join('\n');
    expect(sdOf(sheet, 'both')).toBeCloseTo(Math.sqrt(3.6), 1);
  });

  it('induces negative coupling visible downstream', () => {
    const sheet = [
      'correlate:',
      '  a = normal(0, 1)',
      '  b = normal(0, 1)',
      '  cor(a, b) = -0.8',
      'both = a + b'
    ].join('\n');
    expect(sdOf(sheet, 'both')).toBeCloseTo(Math.sqrt(0.4), 1);
  });

  it('preserves each marginal exactly (mean/sd unchanged)', () => {
    const sheet = [
      'correlate:',
      '  a = normal(10, 2)',
      '  b = normal(5, 1)',
      '  cor(a, b) = 0.7'
    ].join('\n');
    expect(meanOf(sheet, 'a')).toBeCloseTo(10, 1);
    expect(sdOf(sheet, 'a')).toBeCloseTo(2, 1);
    expect(meanOf(sheet, 'b')).toBeCloseTo(5, 1);
    expect(sdOf(sheet, 'b')).toBeCloseTo(1, 1);
  });

  it('couples three members by their pairwise targets', () => {
    // c = a + b + d with cor(a,b)=0.5, others 0: var = 3 + 2·0.5 = 4, sd = 2.
    const sheet = [
      'correlate:',
      '  a = normal(0, 1)',
      '  b = normal(0, 1)',
      '  d = normal(0, 1)',
      '  cor(a, b) = 0.5',
      'c = a + b + d'
    ].join('\n');
    expect(sdOf(sheet, 'c')).toBeCloseTo(2, 1);
  });
});

describe('correlate: block — grouping & rendering', () => {
  it('ends the block at the first dedented line', () => {
    const res = lines(
      [
        'correlate:',
        '  a = normal(0, 1)',
        '  b = normal(0, 1)',
        '  cor(a, b) = 0.5',
        'after = 42'
      ].join('\n'),
      BIG
    );
    const after = res.find((r) => r.name === 'after');
    expect(after?.error).toBeUndefined();
    expect(after?.display?.value).toBe('42');
  });

  it('allows blank and comment lines inside the body', () => {
    const res = lines(
      [
        'correlate:',
        '  a = normal(0, 1)',
        '',
        '  # couple them',
        '  b = normal(0, 1)',
        '  cor(a, b) = 0.5'
      ].join('\n'),
      BIG
    );
    expect(res.find((r) => r.name === 'a')?.error).toBeUndefined();
    expect(res.find((r) => r.name === 'b')?.error).toBeUndefined();
  });
});

describe('correlate: block — errors', () => {
  it('rejects a deterministic member (no samples to reorder)', () => {
    const res = lines(
      ['correlate:', '  a = normal(0, 1)', '  b = 5', '  cor(a, b) = 0.5'].join('\n'),
      BIG
    );
    const b = res.find((r) => r.raw.includes('b = 5'));
    expect(b?.error).toMatch(/distribution/);
  });

  it('rejects |r| >= 1', () => {
    const res = lines(
      ['correlate:', '  a = normal(0, 1)', '  b = normal(0, 1)', '  cor(a, b) = 1'].join('\n'),
      BIG
    );
    const cor = res.find((r) => r.raw.includes('cor(a, b)'));
    expect(cor?.error).toMatch(/\|r\| < 1/);
  });

  it('rejects cor referencing an unknown member', () => {
    const res = lines(
      ['correlate:', '  a = normal(0, 1)', '  b = normal(0, 1)', '  cor(a, x) = 0.5'].join('\n'),
      BIG
    );
    const cor = res.find((r) => r.raw.includes('cor(a, x)'));
    expect(cor?.error).toMatch(/unknown member|x/);
  });

  it('rejects a member that references an outside variable', () => {
    const res = lines(
      [
        'outside = normal(0, 1)',
        'correlate:',
        '  a = normal(0, 1)',
        '  b = outside * 2',
        '  cor(a, b) = 0.5'
      ].join('\n'),
      BIG
    );
    const b = res.find((r) => r.raw.includes('b = outside'));
    expect(b?.error).toBeDefined();
  });

  it('rejects a jointly impossible correlation matrix', () => {
    const res = lines(
      [
        'correlate:',
        '  a = normal(0, 1)',
        '  b = normal(0, 1)',
        '  d = normal(0, 1)',
        '  cor(a, b) = 0.9',
        '  cor(a, d) = 0.9',
        '  cor(b, d) = -0.9'
      ].join('\n'),
      BIG
    );
    const header = res.find((r) => r.raw.trim() === 'correlate:');
    expect(header?.error).toMatch(/positive definite/);
  });
});
