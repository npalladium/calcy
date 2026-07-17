import { describe, expect, it } from 'vitest';
import { makeEngine } from './helpers';

// Golden-corpus / characterisation tests, in the spirit of LLVM `lit` and the
// rustc `ui` suite: a curated set of whole sheets, each rendered to a canonical
// snapshot of its line results. These don't assert any single number — they pin
// the engine's *entire observable output* so that any change (a reformat, a
// reclassification, a new error message, a numeric drift under the fixed seed)
// shows up as a reviewable snapshot diff. Update intentionally with `-u`.
//
// Snapshots are deterministic: the engine seed is fixed (see helpers.FAST).

// Render a sheet to a compact, stable, human-readable form.
function render(sheet: string): string[] {
  const lines = makeEngine().evalSheet(sheet).lines;
  return lines
    .filter((l) => l.kind !== 'blank' && l.kind !== 'comment')
    .map((l) => {
      if (l.error) return `! ${l.name ? `${l.name}: ` : ''}${l.error}`;
      if (l.kind === 'unitdef') return `unit ${l.name}`;
      const body = l.display?.text ?? '(no display)';
      return l.name ? `${l.name} = ${body}` : body;
    });
}

const CASES: Record<string, string> = {
  'units and conversion': ['5 km + 3 mi', '60 km / 1 h', '1.2 GB in MB', '90 km/h in m/s'].join(
    '\n'
  ),

  'variables and reuse': ['rate = 12_000 req/s', 'rate in req/day', 'rate * 30 day'].join('\n'),

  'confidence intervals': ['800 to 1200', 'x = 1 to 10', 'x - x', 'x + x'].join('\n'),

  'named distributions': [
    'normal(100, 15)',
    'lognormal(10, 100)',
    'uniform(0, 10)',
    'exponential(5 day)'
  ].join('\n'),

  'three-point estimates': ['pert(2, 3, 8) day', 'triangular(2, 3, 8) day'].join('\n'),

  'roll-up and deadline odds': [
    'a = (2 to 4) day',
    'b = (5 to 12) day',
    'total = sum(above)',
    'chance(total < 25 day)'
  ].join('\n'),

  'weighted scenarios': ['discrete(0.2, 100, 0.8, 200)', 'discrete(60%: 12, 40%: 20)'].join('\n'),

  'progressive bracket': [
    'income = 50000',
    'bracket(income, 11600: 10%, 47150: 12%, Infinity: 37%, total=yes)'
  ].join('\n'),

  'bayesian update': ['beta(2, 8) seen 3 of 10', 'update(beta(2, 8), k=3, n=10)'].join('\n'),

  'plain english': [
    'two days to four days',
    'between 2 and 4 days',
    '3 ± 1 day',
    'about 5 days'
  ].join('\n'),

  'custom units': ['unit sprint = 2 week', '3 sprint in day'].join('\n'),

  'errors are reported, not thrown': ['5 km + 3 s', '1 / 0 m', 'sqrt(2 m)'].join('\n')
};

describe('golden corpus', () => {
  for (const [name, sheet] of Object.entries(CASES)) {
    it(name, () => {
      expect(render(sheet)).toMatchSnapshot();
    });
  }
});
