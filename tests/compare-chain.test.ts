import { describe, expect, it } from 'vitest';
import { num, values } from './helpers';

// Syntax proposal §6 — comparison chaining.
//
// `10 < x < 20` reads as `(10 < x) and (x < 20)`. Since a comparison yields a
// 0/1 mask (dimensionless), the chain desugars to the product of the adjacent
// comparisons — 1 only where every link holds. Mixed directions (`10 < x > 5`)
// are rejected at parse time rather than silently re-compared.

describe('comparison chaining', () => {
	it('a single comparison is unchanged', () => {
		expect(num('5 < 10')).toBe(1);
		expect(num('10 < 5')).toBe(0);
	});

	it('an increasing chain is the conjunction of its links', () => {
		expect(num('10 < 15 < 20')).toBe(1); // both hold
		expect(num('10 < 25 < 20')).toBe(0); // 25 < 20 fails
		expect(num('10 < 5 < 20')).toBe(0); // 10 < 5 fails
	});

	it('a decreasing chain works too', () => {
		expect(num('20 > 15 > 10')).toBe(1);
		expect(num('20 > 5 > 10')).toBe(0);
	});

	it('mixed </<= and >/>= within one direction is allowed', () => {
		expect(num('10 <= 10 < 20')).toBe(1);
		expect(num('20 >= 20 > 10')).toBe(1);
	});

	it('a three-link chain conjoins all links', () => {
		expect(num('0 < 5 < 10 < 15')).toBe(1);
		expect(num('0 < 5 < 3 < 15')).toBe(0);
	});

	it('mixed directions are a parse error', () => {
		expect(values('10 < 15 > 5')[0].error).toMatch(/direction/i);
	});

	it('chains over a distribution give a probability in [0,1]', () => {
		const opts = { N: 20000, seed: 4 };
		const band = Number(values('x = 1 to 99\nchance(10 < x < 90)', opts)[1].display?.value);
		const oneSided = Number(values('x = 1 to 99\nchance(x < 90)', opts)[1].display?.value);
		expect(band).toBeGreaterThan(0);
		expect(band).toBeLessThan(1);
		// the band probability cannot exceed the one-sided probability
		expect(band).toBeLessThanOrEqual(oneSided + 1e-9);
	});
});
