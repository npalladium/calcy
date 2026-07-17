import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '../src/lib/templates';
import { lines } from './helpers';

// Every starter template must evaluate cleanly — a broken starter is the worst
// possible first impression. Mirrors the cheat-sheet doctest.
describe('starter templates evaluate without error', () => {
  for (const t of TEMPLATES) {
    it(`${t.title}`, () => {
      const ls = lines(t.body);
      const errors = ls
        .filter((l) => l.error)
        .map((l) => `  line ${l.index + 1} "${l.raw.trim()}" → ${l.error}`);
      expect(errors, `template errored:\n${errors.join('\n')}`).toEqual([]);
      expect(ls.some((l) => l.display)).toBe(true);
    });
  }

  it('every template has a title and a one-line blurb', () => {
    for (const t of TEMPLATES) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.blurb.length).toBeGreaterThan(0);
    }
  });
});
