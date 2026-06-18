import { describe, expect, it } from 'vitest';
import { num } from './helpers';

// Dimensionless small-ratio units (ChemE proposal §4). ppm/ppb/ppt and
// percent/permille already ship; pphm rounds out the set. They are ordinary
// dimensionless scale units, so they compose with arithmetic and with `of`.

describe('small-ratio units are dimensionless scales', () => {
	it('ppm / ppb / ppt / pphm have the right magnitudes', () => {
		expect(num('5 ppm')).toBeCloseTo(5e-6, 18);
		expect(num('1 ppb')).toBeCloseTo(1e-9, 21);
		expect(num('1 ppt')).toBeCloseTo(1e-12, 24);
		expect(num('1 pphm')).toBeCloseTo(1e-8, 20);
	});

	it('percent and permille too', () => {
		expect(num('1 percent')).toBeCloseTo(0.01, 12);
		expect(num('1 permille')).toBeCloseTo(1e-3, 15);
	});

	it('a megacount of ppm is one', () => {
		expect(num('1000000 ppm')).toBeCloseTo(1, 9);
	});
});

describe('small-ratio units compose', () => {
	it('with `of` (250 ppm of 1000 = 0.25)', () => {
		expect(num('250 ppm of 1000')).toBeCloseTo(0.25, 9);
	});

	it('with arithmetic (dimensionless)', () => {
		expect(num('5 ppm + 3 ppm')).toBeCloseTo(8e-6, 18);
	});

	it('convert between ratios (1% = 10000 ppm)', () => {
		expect(num('1 percent in ppm')).toBeCloseTo(10000, 6);
	});
});
