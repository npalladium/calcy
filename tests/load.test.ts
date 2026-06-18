import { describe, expect, it } from 'vitest';
import { num, values } from './helpers';

// US-3 (traffic load forecasting) + US-4 (capacity headroom & sizing). Most of
// both stories is composition of existing primitives; the only new code is the
// ceil/floor/round helpers (US-4).
const STAT = { N: 40000, seed: 7 };

describe('US-4 — rounding helpers', () => {
	it('ceil/floor/round are elementwise and preserve dimension', () => {
		expect(num('ceil(2.1 req)')).toBe(3);
		expect(values('ceil(2.1 req)')[0].display?.unit).toBe('req');
		expect(num('floor(2.9)')).toBe(2);
		expect(num('round(2.5)')).toBe(3);
	});

	it('instance sizing with a safety margin (deterministic)', () => {
		// 23000/5000 · 1.3 = 5.98 → ceil → 6
		expect(num('ceil(23000 req/s / (5000 req/s) * 1.3)')).toBe(6);
	});

	it('sizing against an uncertain peak is integer-valued', () => {
		const s = values('peak = (20000 to 28000) req/s\nceil(peak / (5000 req/s))', STAT)[1].summary;
		if (s?.kind !== 'dist') throw new Error('expected dist');
		expect(Number.isInteger(s.min)).toBe(true);
		expect(Number.isInteger(s.max)).toBe(true);
	});
});

describe('US-3 — traffic load forecasting', () => {
	it('peak = avg × factor is still a rate, median ≈ 24k req/s', () => {
		const ls = values('avg = (8000 to 12000) req/s\npeak = avg * (2 to 3)\npeak', STAT);
		const s = ls[2].summary;
		if (s?.kind !== 'dist') throw new Error('expected dist');
		expect(ls[2].isRate).toBe(true);
		expect(s.p50).toBeGreaterThan(20000);
		expect(s.p50).toBeLessThan(28000);
	});

	it('growth projection compounds: 1000 × 1.08^12 ≈ 2518 req/s', () => {
		const v = Number(values('base = 1000 req/s\nbase * 1.08^12')[1].display?.value);
		expect(v).toBeGreaterThan(2500);
		expect(v).toBeLessThan(2540);
	});
});

describe('US-4 — overload odds & headroom', () => {
	it('chance(peak > capacity) is a probability in [0,1]', () => {
		const p = Number(
			values(
				'capacity = 30000 req/s\npeak = (20000 to 28000) req/s\nchance(peak > capacity)',
				STAT
			)[2].display?.value
		);
		expect(p).toBeGreaterThanOrEqual(0);
		expect(p).toBeLessThanOrEqual(1);
		expect(p).toBeLessThan(0.5); // this peak rarely exceeds 30k
	});

	it('fractional headroom against the p95 peak is dimensionless', () => {
		const ls = values('peak = (20000 to 28000) req/s\n30000 req/s / p(peak, 0.95) - 1', STAT);
		expect(ls[1].display?.unit ?? '').toBe(''); // dimensionless
		expect(Number(ls[1].display?.value)).toBeGreaterThan(0);
	});
});
