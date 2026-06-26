import { describe, expect, it } from 'vitest';
import { values } from './helpers';

// Errors carry two layers: `error` is the precise developer message (unchanged,
// what tests and power users rely on); `errorHint` is a plain-language overlay
// the UI shows first. Every translated hint keeps the raw error available.
const hintOf = (src: string) => values(src)[0].errorHint;
const rawOf = (src: string) => values(src)[0].error;
// `errorTopic` names the cheat-sheet group the UI links to from an errored line.
const topicOf = (src: string) => values(src)[0].errorTopic;

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

	it('reports a division by zero as an error, not a bare ∞', () => {
		expect(rawOf('10 / 0')).toMatch(/infinite/i);
		expect(hintOf('10 / 0')).toMatch(/divid/i);
		// flagged as an error, so it never displays "∞"
		expect(values('10 / 0')[0].display).toBeUndefined();
	});

	it('reports a non-real result (√ of a negative) as an error, not NaN', () => {
		expect(rawOf('sqrt(-1)')).toMatch(/not a real number/i);
		expect(hintOf('sqrt(-1)')).toMatch(/real number/i);
		expect(values('sqrt(-1)')[0].display).toBeUndefined();
	});

	it('leaves an already-friendly message without a redundant hint', () => {
		// the CI "did you mean (lo to hi) unit" message is already plain prose
		expect(rawOf('2 to 4 GB/s')).toMatch(/did you mean .*unit/);
		expect(hintOf('2 to 4 GB/s')).toBeUndefined();
	});

	it('non-translated errors have no hint', () => {
		expect(hintOf('pert(8, 3, 2)')).toBeUndefined();
	});

	it('points unit and name errors at the relevant cheat-sheet group', () => {
		expect(topicOf('5 km + 3 s')).toBe('Units & conversion');
		expect(topicOf('5 km in s')).toBe('Units & conversion');
		expect(topicOf('foo + 1')).toBe('Variables & comments');
	});

	it('leaves typo-class errors without a topic (examples wouldn’t help)', () => {
		// a wrong function name is a typo, not a concept gap
		expect(topicOf('wibble(2)')).toBeUndefined();
		expect(topicOf('10 / 0')).toBeUndefined();
	});
});
