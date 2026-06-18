import { describe, expect, it } from 'vitest';
import { num, one } from './helpers';

// Usability fix #1 — `to` is confidence-interval-only (syntax proposal §4 Option
// F). A user typing a conversion (`5 km to mi`) used to get a silent, reversed CI
// in base units. A reversed two-bound interval is almost always a mis-typed
// conversion, so we reject it with a hint pointing at `in`.

describe('reversed two-bound intervals are rejected with a conversion hint', () => {
	it('`5 km to mi` errors instead of silently making a CI', () => {
		const r = one('5 km to mi');
		expect(r.error).toBeTruthy();
		expect(r.error).toMatch(/in/); // suggests the conversion keyword
	});

	it('`between 5 and 3` (reversed) errors too', () => {
		expect(one('between 5 and 3').error).toBeTruthy();
	});

	it('the friendly hint mentions converting with `in`', () => {
		const r = one('5 km to mi');
		expect(r.errorHint ?? r.error ?? '').toMatch(/convert|in /i);
	});
});

describe('well-ordered intervals still work', () => {
	it('an ascending CI is unaffected', () => {
		expect(one('5 to 10').error).toBeFalsy();
		expect(one('100 to 200 ms').error).toBeFalsy();
		expect(one('5 km to 8 km').error).toBeFalsy();
	});

	it('symmetric forms (± / about) with negatives are not falsely flagged', () => {
		expect(one('about -5').error).toBeFalsy();
		expect(one('-5 ± 1').error).toBeFalsy();
	});

	it('conversion with `in` is the right way and works', () => {
		expect(num('5 km in mi')).toBeCloseTo(3.10686, 4);
	});
});
