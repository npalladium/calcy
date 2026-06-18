import { describe, expect, it } from 'vitest';
import { num, one, values } from './helpers';

// Syntax proposal §2 — first-class `%`.
//
// Most of `%` already works (`20%` → 0.2, `10% * 200` → 20, `200 + 10%` →
// 200.1 literal). The one gap is `<value> of <value>`: `20% of 200` should be
// 40, but `of` mis-fired as function application on the `%` unit. `of` now
// means multiplication when its left side is a value (not a function name),
// while `f of x` still applies `f` to `x`.

describe('percent as a value', () => {
	it('bare percent literals are ×0.01 (pinned)', () => {
		expect(num('20%')).toBe(0.2);
		expect(num('50%')).toBe(0.5);
		expect(num('10% * 200')).toBe(20);
	});
});

describe('`of` as multiplication for values', () => {
	it('percent of a number', () => {
		expect(num('20% of 200')).toBe(40);
		expect(num('10% of 50')).toBe(5);
	});

	it('a plain number of a number', () => {
		expect(num('0.2 of 200')).toBe(40);
	});

	it('percent of a dimensioned quantity keeps the dimension', () => {
		expect(num('25% of 4 kg in kg')).toBe(1);
		expect(one('25% of 4 kg in kg').display?.unit).toBe('kg');
	});
});

describe('`f of x` function application still works', () => {
	it('mean of (1 to 9) applies mean', () => {
		const r = one('mean of (1 to 9)');
		expect(r.error).toBeFalsy();
		expect(Number(r.display?.value)).toBeGreaterThan(0);
	});

	it('p of a distribution still applies p', () => {
		expect(values('(800 to 1200) |> p(0.95)')[0].error).toBeFalsy();
	});

	// Regression: `of`-as-multiplication must not swallow the `of` separator in
	// the `seen k of n` Bayesian-update postfix (`3 of 10` is k/n, not 3×10).
	it('seen K of N still parses alongside `of`-multiplication', () => {
		expect(values('beta(2, 8) seen 3 of 10')[0].error).toBeFalsy();
	});
});
