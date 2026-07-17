import { describe, expect, it } from 'vitest';
import { type Line, type Node, parseLine, tokenize } from '../src/lib/engine/parse';
import { DEFAULT_UNITS } from '../src/lib/engine/units';

const deps = { isUnit: (n: string) => DEFAULT_UNITS.has(n) };
const p = (s: string): Line => parseLine(s, deps);
const expr = (s: string): Node => {
  const line = p(s);
  if (line.type !== 'expr') throw new Error(`expected expr, got ${line.type}`);
  return line.expr;
};

describe('tokenizer', () => {
  it('parses numbers with underscores, decimals, and exponents', () => {
    expect(tokenize('12_000')[0].num).toBe(12000);
    expect(tokenize('1.04e9')[0].num).toBe(1.04e9);
    expect(tokenize('.5')[0].num).toBe(0.5);
    expect(tokenize('3e-2')[0].num).toBe(0.03);
    expect(tokenize('2.5E+3')[0].num).toBe(2500);
  });
  it('classifies identifiers and operators', () => {
    const t = tokenize('rate / s');
    expect(t.map((x) => x.kind)).toEqual(['ident', 'op', 'ident']);
  });
  it('throws on an unexpected character', () => {
    expect(() => tokenize('5 @ 3')).toThrow(/unexpected character/);
  });
});

describe('line classification', () => {
  it('blank vs comment vs expr vs assignment vs unitdef', () => {
    expect(p('').type).toBe('blank');
    expect(p('   ').type).toBe('blank');
    expect(p('# just a comment').type).toBe('comment');
    expect(p('5 + 3').type).toBe('expr');
    const a = p('x = 5');
    expect(a.type).toBe('assign');
    if (a.type === 'assign') expect(a.name).toBe('x');
    const u = p('unit sprint = 2 week');
    expect(u.type).toBe('unitdef');
    if (u.type === 'unitdef') expect(u.definition).toBe('2 week');
  });

  it('captures trailing comments', () => {
    const line = p('5 km # distance');
    expect(line.type).toBe('expr');
    if (line.type === 'expr') expect(line.comment).toBe('distance');
  });

  it('rejects trailing tokens', () => {
    expect(() => p('5 +')).toThrow();
    expect(() => p('(5')).toThrow();
    expect(() => p('5)')).toThrow();
  });
});

describe('precedence & associativity', () => {
  it('multiplication binds tighter than addition', () => {
    const e = expr('2 + 3 * 4');
    expect(e).toMatchObject({ type: 'bin', op: '+', right: { type: 'bin', op: '*' } });
  });

  it('implicit multiplication binds tighter than division', () => {
    // 60 km / 1 h  ==  (60 km) / (1 h), NOT ((60 km)/1) h
    const e = expr('60 km / 1 h');
    expect(e).toMatchObject({ type: 'bin', op: '/' });
    if (e.type === 'bin') expect(e.right).toMatchObject({ type: 'bin', op: '*' });
  });

  it('power is right-associative', () => {
    const e = expr('2 ^ 3 ^ 2');
    expect(e).toMatchObject({
      type: 'bin',
      op: '^',
      right: { type: 'bin', op: '^' }
    });
  });

  it('unary minus and × ÷ symbols', () => {
    expect(expr('-5')).toMatchObject({ type: 'neg' });
    expect(expr('6 × 7')).toMatchObject({ type: 'bin', op: '*' });
    expect(expr('6 ÷ 7')).toMatchObject({ type: 'bin', op: '/' });
  });

  it('function calls with multiple args', () => {
    const e = expr('normal(10, 2)');
    expect(e).toMatchObject({ type: 'call', name: 'normal' });
    if (e.type === 'call') expect(e.args).toHaveLength(2);
  });
});

describe('`to` is CI, `in` is conversion (no lookahead)', () => {
  it('`to` always builds a confidence interval', () => {
    expect(expr('5 to 10')).toMatchObject({ type: 'ci' });
    expect(expr('1 to 10')).toMatchObject({ type: 'ci' });
    // even when the RHS is a bare unit: `5 km to mi` is a CI, not a conversion
    expect(expr('5 km to mi')).toMatchObject({ type: 'ci' });
  });
  it('`in` is always a conversion', () => {
    expect(expr('5 km in mi')).toMatchObject({ type: 'convert', unitText: 'mi' });
    expect(expr('rate in req/day')).toMatchObject({ type: 'convert', unitText: 'req/day' });
  });
});

describe('bare `weight:` (no value)', () => {
  it('parses as a weight with no value when it is the final positional argument', () => {
    const e = expr('bracket(income, 100: 10%, 200:)');
    expect(e).toMatchObject({ type: 'call', name: 'bracket' });
    if (e.type !== 'call') return;
    expect(e.args).toHaveLength(3);
    const last = e.args[2];
    expect(last.weight).toBeDefined();
    expect(last.value).toBeUndefined();
  });
  it('rejects bare weight: in any non-final position', () => {
    expect(() => p('bracket(income, 100:, 200: 10%)')).toThrow(/last argument/);
    expect(() => p('bracket(income, 100:, 200:)')).toThrow(/last argument/);
  });
});

describe('list literals', () => {
  it('parses a comma-separated list as a list node', () => {
    const e = expr('[1, 2, 3, 4, 5]');
    expect(e).toMatchObject({
      type: 'list',
      items: [
        { type: 'num', value: 1 },
        { type: 'num', value: 2 },
        { type: 'num', value: 3 },
        { type: 'num', value: 4 },
        { type: 'num', value: 5 }
      ]
    });
  });
  it('a single-element list is a list of one', () => {
    const e = expr('[5]');
    expect(e).toMatchObject({ type: 'list' });
    if (e.type !== 'list') return;
    expect(e.items).toHaveLength(1);
  });
  it('an empty list is an error', () => {
    expect(() => p('[]')).toThrow();
  });
  it('a list may contain expressions, not just numbers', () => {
    const e = expr('[1 + 2, 3 * 4]');
    expect(e).toMatchObject({ type: 'list' });
    if (e.type !== 'list') return;
    expect(e.items).toHaveLength(2);
  });
});

describe('range literals', () => {
  it('parses `a..b` as a range node', () => {
    const e = expr('1..5');
    expect(e).toMatchObject({
      type: 'range',
      lo: { type: 'num', value: 1 },
      hi: { type: 'num', value: 5 }
    });
  });
  it('parses `a..b step k` as a range with step', () => {
    const e = expr('1..10 step 2');
    expect(e).toMatchObject({ type: 'range', step: { type: 'num', value: 2 } });
  });
  it('a range with no step has step undefined', () => {
    const e = expr('1..5');
    expect(e).toMatchObject({ type: 'range' });
    if (e.type !== 'range') return;
    expect(e.step).toBeUndefined();
  });
});
