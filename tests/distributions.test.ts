import { describe, expect, it } from 'vitest';
import { num, values } from './helpers';

// New distributions for the count/event domain plus scenario weighting and a
// clamp utility. Statistical assertions use a larger N and a fixed seed.
const STAT = { N: 40000, seed: 7 };

const summaryOf = (src: string, opts = STAT) => {
	const s = values(src, opts)[0].summary;
	if (s?.kind !== 'dist') throw new Error(`expected dist for: ${src}`);
	return s;
};

const allIntegers = (src: string, opts = STAT) => {
	const s = summaryOf(src, opts);
	// quantiles of an integer-valued sample stay integers
	return [s.min, s.p5, s.p50, s.p95, s.max].every((x) => Number.isInteger(x));
};

describe('poisson(mean)', () => {
	it('mean ≈ λ and variance ≈ λ (small λ, Knuth)', () => {
		const s = summaryOf('poisson(8)');
		expect(s.mean).toBeGreaterThan(7.6);
		expect(s.mean).toBeLessThan(8.4);
		expect(s.sd).toBeGreaterThan(Math.sqrt(8) * 0.85);
		expect(s.sd).toBeLessThan(Math.sqrt(8) * 1.15);
	});

	it('mean ≈ λ for large λ (normal approximation)', () => {
		const s = summaryOf('poisson(500)');
		expect(s.mean).toBeGreaterThan(490);
		expect(s.mean).toBeLessThan(510);
		expect(s.min).toBeGreaterThanOrEqual(0);
	});

	it('produces whole counts, small and large λ', () => {
		expect(allIntegers('poisson(8)')).toBe(true);
		expect(allIntegers('poisson(500)')).toBe(true);
	});

	it('carries the count unit of its argument', () => {
		expect(values('poisson(50 req)', STAT)[0].display?.unit).toBe('req');
		// and the bare form attaches a unit by multiplication
		expect(values('poisson(50) req', STAT)[0].display?.unit).toBe('req');
	});

	it('rejects a negative mean', () => {
		expect(values('poisson(-3)')[0].error).toMatch(/non-negative/);
	});
});

describe('exponential(mean)', () => {
	it('mean of samples ≈ the given mean, all non-negative', () => {
		const s = summaryOf('exponential(5 day)');
		const day = 86400;
		expect(s.mean / day).toBeGreaterThan(4.7);
		expect(s.mean / day).toBeLessThan(5.3);
		expect(s.min).toBeGreaterThanOrEqual(0);
	});

	it('median ≈ mean·ln2 (right-skewed)', () => {
		const s = summaryOf('exponential(10)');
		expect(s.p50).toBeGreaterThan(10 * Math.LN2 * 0.9);
		expect(s.p50).toBeLessThan(10 * Math.LN2 * 1.1);
	});

	it('carries units and rejects a non-positive mean', () => {
		expect(values('exponential(5 day)', STAT)[0].display?.unit).toBe('s');
		expect(values('exponential(0)')[0].error).toMatch(/positive/);
	});
});

describe('triangular(lo, mode, hi)', () => {
	it('mean ≈ (lo+mode+hi)/3 and support is [lo, hi]', () => {
		const s = summaryOf('triangular(2, 3, 8) day');
		const day = 86400;
		expect(s.mean / day).toBeGreaterThan((13 / 3) * 0.95);
		expect(s.mean / day).toBeLessThan((13 / 3) * 1.05);
		expect(s.min / day).toBeGreaterThanOrEqual(2);
		expect(s.max / day).toBeLessThanOrEqual(8);
	});

	it('validates ordering, range, and shared units', () => {
		expect(values('triangular(8, 3, 2)')[0].error).toMatch(/lo < hi/);
		expect(values('triangular(2, 9, 8)')[0].error).toMatch(/mode/);
		expect(values('triangular(2 day, 3 kg, 8 day)')[0].error).toMatch(/share units/);
	});
});

describe('discrete(w, v, …) weighted scenarios', () => {
	it('weighted mean matches the scenario weights', () => {
		// 25% → 0, 75% → 10  ⇒  mean ≈ 7.5
		const s = summaryOf('discrete(0.25, 0, 0.75, 10)');
		expect(s.mean).toBeGreaterThan(7.2);
		expect(s.mean).toBeLessThan(7.8);
	});

	it('equal weights behave like a fair split', () => {
		const s = summaryOf('discrete(1, 0, 1, 10)');
		expect(s.mean).toBeGreaterThan(4.5);
		expect(s.mean).toBeLessThan(5.5);
	});

	it('values may be distributions and must share units', () => {
		expect(values('discrete(0.5, 1 to 2, 0.5, 8 to 9)')[0].isDist).toBe(true);
		expect(values('discrete(0.5, 2 day, 0.5, 3 kg)')[0].error).toMatch(/share units/);
	});

	it('rejects bad pairings and weights', () => {
		expect(values('discrete(0.5, 1, 0.5)')[0].error).toMatch(/pairs|w1, v1/);
		expect(values('discrete(-1, 1, 2, 2)')[0].error).toMatch(/non-negative|weight/);
	});
});

describe('clamp(x, lo[, hi])', () => {
	it('bounds a distribution on both sides', () => {
		const s = summaryOf('clamp(1 to 9, 2, 7)');
		expect(s.min).toBeGreaterThanOrEqual(2);
		expect(s.max).toBeLessThanOrEqual(7);
	});

	it('two-arg form is a lower bound only', () => {
		const s = summaryOf('clamp(-5 to 5, 0)');
		expect(s.min).toBeGreaterThanOrEqual(0);
		expect(s.max).toBeGreaterThan(0);
	});

	it('works on scalars and preserves units', () => {
		expect(num('clamp(12 day, 0 day, 10 day) in day')).toBeCloseTo(10, 9);
		expect(num('clamp(5, 0, 10)')).toBe(5);
	});

	it('requires bounds to share units with x', () => {
		expect(values('clamp(5 day, 0 kg)')[0].error).toMatch(/share units|units/);
	});
});
