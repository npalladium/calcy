import { describe, expect, it } from 'vitest';
import { values } from './helpers';

// Errors carry two layers: `error` is the precise developer message (unchanged,
// what tests and power users rely on); `errorHint` is a plain-language overlay
// the UI shows first. Every translated hint keeps the raw error available.
const hintOf = (src: string) => values(src)[0].errorHint;
const rawOf = (src: string) => values(src)[0].error;

describe('friendly error hints', () => {
	it('translates a dimension mismatch but keeps the raw error', () => {
		expect(rawOf('5 km + 3 s')).toMatch(/incompatible dimensions/);
		expect(hintOf('5 km + 3 s')).toMatch(/can't add/i);
	});

	it('explains an unknown identifier', () => {
		expect(rawOf('foo + 1')).toMatch(/unknown identifier/);
		expect(hintOf('foo + 1')).toMatch(/don't recognise/i);
	});

	it('explains an unknown function', () => {
		expect(hintOf('wibble(2)')).toMatch(/no function called/i);
	});

	it('explains a comparison of unlike quantities', () => {
		expect(hintOf('1 day < 2 kg')).toMatch(/can't compare/i);
	});

	it('explains a bad conversion', () => {
		expect(hintOf('5 km in s')).toMatch(/can't convert/i);
	});

	it('explains a dimensionless requirement in plain terms', () => {
		expect(hintOf('chance(5 day)')).toMatch(/plain number/i);
	});

	it('leaves an already-friendly message without a redundant hint', () => {
		// the CI "did you mean (lo to hi) unit" message is already plain prose
		expect(rawOf('2 to 4 GB/s')).toMatch(/did you mean .*unit/);
		expect(hintOf('2 to 4 GB/s')).toBeUndefined();
	});

	it('non-translated errors have no hint', () => {
		expect(hintOf('pert(8, 3, 2)')).toBeUndefined();
	});
});
