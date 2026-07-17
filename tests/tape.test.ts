import { describe, expect, it } from 'vitest';
import { type TapeRow, tapePrefix, tapeSheet } from '../src/lib/tape';

const rows = (...specs: [TapeRow['op'], string][]): TapeRow[] =>
  specs.map(([op, operand]) => ({ op, operand }));

describe('tapePrefix', () => {
  it('wraps a single start value in parens', () => {
    expect(tapePrefix(rows(['=', '1000 req/s']), 0)).toBe('(1000 req/s)');
  });

  it('left-associates operations up to the given row', () => {
    const r = rows(['=', '1000 req/s'], ['*', '2'], ['/', '4']);
    expect(tapePrefix(r, 1)).toBe('((1000 req/s) * (2))');
    expect(tapePrefix(r, 2)).toBe('(((1000 req/s) * (2)) / (4))');
  });

  it('treats a blank operand as 0 so the expression stays valid', () => {
    expect(tapePrefix(rows(['=', ''], ['+', '']), 1)).toBe('((0) + (0))');
  });

  it('preserves uncertainty operands verbatim', () => {
    expect(tapePrefix(rows(['=', '10 to 30 kg'], ['*', '2']), 1)).toBe('((10 to 30 kg) * (2))');
  });
});

describe('tapeSheet', () => {
  it('emits one prefix line per row so each running value is evaluated', () => {
    const r = rows(['=', '1000'], ['*', '2'], ['-', '500']);
    expect(tapeSheet(r)).toBe('(1000)\n((1000) * (2))\n(((1000) * (2)) - (500))');
  });
});
