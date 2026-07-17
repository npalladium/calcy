import { describe, expect, it } from 'vitest';
import { values } from './helpers';

// Weibull(shape=k, scale=λ): reliability / time-to-failure workhorse. The scale
// carries the units; the shape is dimensionless. Analytics need a Lanczos
// gamma() (the codebase ships only a gamma *sampler*), so the exact mean/sd/
// quantile assertions here also guard that helper.
const STAT = { N: 40000, seed: 7 };

const summaryOf = (src: string, opts = STAT) => {
	const l = values(src, opts)[0];
	if (l.error) throw new Error(`${src} → ${l.error}`);
	if (l.summary?.kind !== 'dist') throw new Error(`expected dist for: ${src}`);
	return l.summary;
};

// Read the exact analytic scalar of a reducer line (formatter rounds `text`).
const exact = (src: string, opts = STAT): number => {
	const l = values(src, opts)[0];
	if (l.error) throw new Error(`${src} → ${l.error}`);
	if (l.summary?.kind !== 'point') throw new Error(`expected point for: ${src}`);
	return l.summary.value;
};

// Γ(1 + 1/k) etc. Reference values used below:
//   Γ(2)   = 1            (k = 1 → mean = λ, sd = λ; i.e. exponential)
//   Γ(1.5) = √π/2 ≈ 0.886226925
//   Γ(2)   with k=2 → mean = λ·Γ(1.5)

describe('weibull(shape, scale)', () => {
	it('k = 1 reduces to exponential(mean = scale)', () => {
		const s = summaryOf('weibull(1, 10)');
		expect(s.mean).toBeGreaterThan(9.4);
		expect(s.mean).toBeLessThan(10.6);
		// exponential has sd == mean
		expect(s.sd).toBeGreaterThan(9.0);
		expect(s.sd).toBeLessThan(11.0);
		expect(s.min).toBeGreaterThanOrEqual(0);
	});

	it('exact analytic mean = scale · Γ(1 + 1/shape)', () => {
		// k = 2, λ = 10 → mean = 10 · Γ(1.5) = 10 · 0.8862269 = 8.862269
		expect(exact('mean(weibull(2, 10))')).toBeCloseTo(8.862269, 4);
	});

	it('exact analytic sd = scale · √(Γ(1+2/k) − Γ(1+1/k)²)', () => {
		// k = 2, λ = 10 → sd = 10·√(Γ(2) − Γ(1.5)²) = 10·√(1 − 0.785398) = 4.632514.
		// The displayed summary.sd reads the exact moment (the sd() reducer is
		// sample-based for every family, so it isn't exact).
		expect(summaryOf('weibull(2, 10)').sd).toBeCloseTo(4.632514, 4);
	});

	it('exact analytic quantile p(d, q) = scale · (−ln(1−q))^(1/shape)', () => {
		// median (q = 0.5), k = 2, λ = 10 → 10·√(ln2) = 8.32555
		expect(exact('p(weibull(2, 10), 0.5)')).toBeCloseTo(8.32555, 4);
		// q = 0.9, k = 2, λ = 10 → 10·√(−ln 0.1) = 15.1743
		expect(exact('p(weibull(2, 10), 0.9)')).toBeCloseTo(15.1743, 3);
	});

	it('scale carries the units; shape is dimensionless', () => {
		// Like exponential, the constructor renders the scale's dimension in base
		// units (day → s); multiplying a bare unit on afterwards keeps its hint.
		expect(values('weibull(1.5, 200 day)', STAT)[0].display?.unit).toBe('s');
		expect(values('weibull(1.5, 200) day', STAT)[0].display?.unit).toBe('day');
	});

	it('accepts keyword params in either order', () => {
		expect(exact('mean(weibull(shape = 2, scale = 10))')).toBeCloseTo(8.862269, 4);
		expect(exact('mean(weibull(scale = 10, shape = 2))')).toBeCloseTo(8.862269, 4);
	});

	it('rejects non-positive shape/scale and a dimensioned shape', () => {
		expect(values('weibull(0, 10)')[0].error).toMatch(/shape.*positive|positive/);
		expect(values('weibull(2, 0)')[0].error).toMatch(/scale.*positive|positive/);
		expect(values('weibull(2 day, 10)')[0].error).toMatch(/dimensionless|shape/);
	});
});
