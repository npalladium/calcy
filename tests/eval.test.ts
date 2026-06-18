import { describe, expect, it } from 'vitest';
import { num, one, text, values } from './helpers';

const err = (t: string) => one(t).error;

describe('scalar arithmetic', () => {
	it.each([
		['2 + 3', '5'],
		['10 - 4', '6'],
		['6 * 7', '42'],
		['20 / 4', '5'],
		['2 ^ 10', '1024'],
		['-5', '-5'],
		['2 + 3 * 4', '14'],
		['(2 + 3) * 4', '20']
	])('%s = %s', (q, expected) => {
		expect(text(q)).toBe(expected);
	});
});

describe('dimensional composition', () => {
	it('division composes a rate', () => {
		const r = one('6 m / 2 s');
		expect(r.display?.text).toBe('3 m/s');
		expect(r.isRate).toBe(true);
	});
	it('powers scale dimensions', () => {
		expect(text('(2 m)^2')).toBe('4 m^2');
	});
	it('rejects adding/subtracting incompatible dimensions with a detailed message', () => {
		expect(err('5 km + 3 s')).toBe('incompatible dimensions: m + s');
		expect(err('5 km - 3 s')).toBe('incompatible dimensions: m - s');
		// the dimensionless side reads as "number"
		expect(err('5 + 1 m')).toBe('incompatible dimensions: number + m');
	});
	it('rejects conversions across dimensions with a detailed message', () => {
		expect(err('5 km in s')).toBe('cannot convert m to s');
		expect(err('5 in m')).toBe('cannot convert number to m');
	});
	it('rejects a dimensioned exponent', () => {
		expect(err('2 ^ (1 m)')).toMatch(/dimensionless/i);
	});
});

describe('distribution constructors are sampled', () => {
	it.each([
		'normal(10, 2)',
		'uniform(0, 1)',
		'lognormal(10, 100)',
		'beta(2, 2)',
		'mixture(1 to 2, 8 to 9)'
	])('%s is a distribution', (q) => {
		expect(one(q).isDist).toBe(true);
	});
	it('a confidence interval carries units', () => {
		const r = one('5 m to 10 m');
		expect(r.isDist).toBe(true);
		expect(r.display?.unit).toBe('m');
	});
	it('constructors carry the units of their arguments', () => {
		expect(one('normal(10 m, 2 m)').display?.unit).toBe('m');
		expect(one('uniform(0 kg, 10 kg)').display?.unit).toBe('kg');
		expect(one('lognormal(10 s, 100 s)').display?.unit).toBe('s');
	});
	it('arguments must share units', () => {
		expect(err('normal(10 m, 2 s)')).toMatch(/share units/i);
		expect(err('uniform(1 m, 2 s)')).toMatch(/share units/i);
		expect(err('lognormal(10 m, 100 s)')).toMatch(/share units/i);
		expect(err('mixture(1 m, 2 s)')).toMatch(/share units/i);
	});
	it('argument counts are enforced', () => {
		expect(err('normal(1)')).toMatch(/normal/);
		expect(err('uniform(1)')).toMatch(/uniform/);
		expect(err('lognormal(1, 2, 3)')).toMatch(/lognormal/);
		expect(err('beta(2)')).toMatch(/beta/);
		expect(err('mixture(5)')).toMatch(/mixture/);
		expect(err('p(1 to 10)')).toMatch(/dist/);
	});
	it('domain and scalar-parameter errors', () => {
		expect(err('lognormal(-1, 5)')).toMatch(/positive/i);
		expect(err('beta(2 m, 2)')).toMatch(/dimensionless/i);
		expect(err('normal(1 to 2, 1)')).toMatch(/scalar/i); // a dist where a scalar is required
		expect(err('uniform(1 to 2, 5)')).toMatch(/scalar/i);
	});
});

describe('reducers collapse to scalars', () => {
	it('mean/median/p/sd of a distribution are points', () => {
		expect(one('mean(1 to 10)').isDist).toBeFalsy();
		expect(one('p(1 to 100, 0.5)').isDist).toBeFalsy();
		expect(num('mean(5)')).toBe(5); // scalar passthrough
		expect(num('sd(5)')).toBe(0);
	});
	it('median ~ midpoint and p95 > p5 for a symmetric CI', () => {
		expect(num('median(40 to 60)')).toBeGreaterThan(45);
		expect(num('median(40 to 60)')).toBeLessThan(55);
		expect(num('p(1 to 100, 0.95)')).toBeGreaterThan(num('p(1 to 100, 0.05)'));
	});
});

describe('elementwise math', () => {
	it.each([
		['sqrt(16)', '4'],
		['abs(-3)', '3'],
		['ln(1)', '0'],
		['exp(0)', '1'],
		['log10(100)', '2']
	])('%s = %s', (q, expected) => {
		expect(text(q)).toBe(expected);
	});
	it('sqrt halves dimensions', () => {
		expect(text('sqrt((4 m^2))')).toBe('2 m');
	});
	it('log/exp require dimensionless input', () => {
		expect(err('ln(5 m)')).toMatch(/dimensionless/i);
	});
});

describe('identifier & function resolution errors', () => {
	it('unknown identifier and unknown function', () => {
		expect(err('foo')).toMatch(/unknown identifier/i);
		expect(err('bogus(1)')).toMatch(/unknown function/i);
	});
	it('a later line can use an earlier assignment', () => {
		const ls = values('a = 3 m\na * 2');
		expect(ls[0].name).toBe('a');
		expect(ls[0].display?.text).toBe('3 m'); // the assignment shows its value
		expect(ls[1].display?.text).toBe('6 m'); // and is reusable below
	});
});

describe('list literals', () => {
	it('sum, mean, min, max consume a list directly', () => {
		expect(num('sum([1, 2, 3, 4, 5])')).toBeCloseTo(15);
		expect(num('mean([1, 2, 3, 4, 5])')).toBeCloseTo(3);
		expect(num('min([5, 2, 8, 1])')).toBeCloseTo(1);
		expect(num('max([5, 2, 8, 1])')).toBeCloseTo(8);
	});
	it('a range expands to a list', () => {
		expect(num('sum(1..5)')).toBeCloseTo(15);
		expect(num('mean(1..5)')).toBeCloseTo(3);
	});
	it('a stepped range respects the step', () => {
		expect(num('sum(1..10 step 2)')).toBeCloseTo(25); // 1+3+5+7+9
		expect(num('sum(1..10 step 3)')).toBeCloseTo(22); // 1+4+7+10
	});
	it('a range with a fractional step', () => {
		expect(num('sum(1.0..2.0 step 0.5)')).toBeCloseTo(1 + 1.5 + 2);
	});
	it('median/sd/p reject a list (they are distribution-only)', () => {
		expect(err('median([1, 2, 3])')).toMatch(/list/);
		expect(err('sd([1, 2, 3])')).toMatch(/list/);
		expect(err('p([1, 2, 3], 0.5)')).toMatch(/list/);
	});
	it('a list with mixed units is rejected', () => {
		expect(err('sum([1, 2 m])')).toMatch(/unit|dimens/i);
	});
	it('discrete() and mixture() consume a list as equal-weight scenarios', () => {
		// Equal-weight picks converge to the simple mean; with N=2000 samples,
		// tolerate a few percent of Monte-Carlo noise.
		expect(num('mean(discrete([1, 2, 3, 4]))')).toBeCloseTo(2.5, 1);
		expect(num('mean(mixture([10, 20, 30]))')).toBeCloseTo(20, -1);
	});
	it('a list literal at top level is an error (use sum/mean/etc.)', () => {
		expect(err('[1, 2, 3]')).toMatch(/list/i);
	});
});

describe('ranges as inputs to distribution constructors', () => {
	it('discrete(1..6) is a six-sided die', () => {
		// Each draw picks one face uniformly; mean of the distribution converges to 3.5.
		expect(num('mean(discrete(1..6))')).toBeCloseTo(3.5, 0);
		// sum() on a distribution returns its mean across samples, not the sum of values.
		expect(num('sum([1, 2, 3, 4, 5, 6])')).toBe(21);
	});
});
