import { describe, expect, it } from 'vitest';
import { CHEAT_SHEET } from '../src/lib/cheatsheet';
import { lines } from './helpers';

// Doctests for the in-app cheat sheet: every example a user can click to insert
// must actually evaluate. A group's snippets are concatenated in order (later
// lines may build on earlier ones, e.g. `total = sum(above)`), then we assert no
// result line reports an error. This fails loudly if a grammar change ever
// breaks an advertised example.
describe('cheat-sheet examples evaluate without error', () => {
  for (const group of CHEAT_SHEET) {
    const sheet = group.items.map((i) => i.code).join('\n');
    it(`${group.title}`, () => {
      const ls = lines(sheet);
      const errors = ls
        .filter((l) => l.error)
        .map((l) => `  line ${l.index + 1} "${l.raw.trim()}" → ${l.error}`);
      expect(errors, `examples errored:\n${errors.join('\n')}`).toEqual([]);
      // And at least one line produced a usable result (display or unit def).
      expect(ls.some((l) => l.display || l.kind === 'unitdef')).toBe(true);
    });
  }

  // Spot-check a couple of individual snippets resolve to the right shape, so
  // the suite would catch a silently-wrong (but non-erroring) regression.
  it('individual snippets keep their meaning', () => {
    expect(lines('two days to four days')[0].isDist).toBe(true);
    expect(lines('about 5 days')[0].isDist).toBe(true);
    const xMinusX = lines('x = 1 to 10\nx - x');
    expect(xMinusX[1].display?.text).toBe('0');
  });
});
