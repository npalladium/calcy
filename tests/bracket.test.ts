import { describe, expect, it } from 'vitest';
import { makeEngine, num, one, values } from './helpers';

// bracket(x, u1: r1, u2: r2, …): piecewise-constant marginal function over
// progressive tiers. With `total = yes`, returns the cumulative integral
// ∫₀ˣ rate(t) dt instead. Tiers are left-closed / right-open: at an exact
// boundary the upper tier wins.

const FED =
	'bracket(income, 11600: 10%, 47150: 12%, 100525: 22%, 191950: 24%, 243725: 32%, 609350: 35%, Infinity: 37%)';
const FED_TOTAL = `${FED.slice(0, -1)}, total = yes)`;

describe('bracket(): marginal rate', () => {
	it('returns the bottom tier rate for x in the first tier', () => {
		expect(num(FED.replace('income', '0'))).toBeCloseTo(0.1, 6);
		expect(num(FED.replace('income', '10000'))).toBeCloseTo(0.1, 6);
	});
	it('returns the next tier rate for x in an interior tier', () => {
		// 30000 is in tier 2 (11600–47150, rate 12%)
		expect(num(FED.replace('income', '30000'))).toBeCloseTo(0.12, 6);
		// 150000 is in tier 4 (100525–191950, rate 24%)
		expect(num(FED.replace('income', '150000'))).toBeCloseTo(0.24, 6);
	});
	it('returns the top tier rate for x above all finite bounds', () => {
		expect(num(FED.replace('income', '1000000'))).toBeCloseTo(0.37, 6);
	});
	it('is left-closed / right-open: at an exact boundary the upper tier wins', () => {
		expect(num(FED.replace('income', '11600'))).toBeCloseTo(0.12, 6);
		expect(num(FED.replace('income', '47150'))).toBeCloseTo(0.22, 6);
		expect(num(FED.replace('income', '609350'))).toBeCloseTo(0.37, 6);
	});
	it('returns dimensionless (a percent stored as its fraction)', () => {
		const r = one(FED.replace('income', '50000'));
		expect(r.display?.unit).toBe('');
	});
	it('extends the top tier when no Infinity bound is given', () => {
		// x past all finite bounds clamps to the last tier's rate.
		expect(num('bracket(1e9, 100: 10%, 1000: 20%)')).toBeCloseTo(0.2, 6);
	});
	it('rejects Infinity used as a non-final bound', () => {
		expect(values('bracket(50, Infinity: 10%, 100: 20%)')[0].error).toMatch(/below previous/);
	});
});

describe('bracket(): total (cumulative)', () => {
	it('integrates a single tier', () => {
		expect(num('bracket(50, 100: 25%, total=yes)')).toBeCloseTo(12.5, 6);
	});
	it('integrates a multi-tier table at an interior point', () => {
		// x=30000 falls in tier 2 (11600–47150): 11600@10 + (30000−11600)@12 = 1160 + 2208 = 3368
		expect(num(FED_TOTAL.replace('income', '30000'))).toBeCloseTo(3368, 4);
	});
	it('integrates exactly up to a boundary', () => {
		// 11600 @ 10% = 1160
		expect(num(FED_TOTAL.replace('income', '11600'))).toBeCloseTo(1160, 4);
	});
	it('integrates all the way to a tier boundary cleanly', () => {
		// 11600 @ 10% + (47150 − 11600) @ 12% = 1160 + 4266 = 5426
		expect(num(FED_TOTAL.replace('income', '47150'))).toBeCloseTo(5426, 4);
	});
	it('keeps integrating through every tier up to x', () => {
		// 11600@10 + 35550@12 + 53375@22 + 91425@24
		// = 1160 + 4266 + 11742.5 + 21942 = 39110.5
		// (tolerate a 1-unit display-rounding drift from format.ts plain())
		expect(num(FED_TOTAL.replace('income', '191950'))).toBeGreaterThan(39109);
		expect(num(FED_TOTAL.replace('income', '191950'))).toBeLessThan(39112);
	});
	it('is open-ended above the top tier', () => {
		// 11600@10 + 35550@12 + 53375@22 + 91425@24 + 51775@32 + 365625@35 + 390650@37
		// = 1160 + 4266 + 11742.5 + 21942 + 16568 + 127968.75 + 144540.5 = 328187.75
		expect(num(FED_TOTAL.replace('income', '1000000'))).toBeGreaterThan(328186);
		expect(num(FED_TOTAL.replace('income', '1000000'))).toBeLessThan(328189);
	});
	it('returns x-zero for x below the first tier', () => {
		expect(num(FED_TOTAL.replace('income', '-1000'))).toBeCloseTo(0, 6);
	});
});

describe('bracket(): distributions (elementwise)', () => {
	it('broadcasts total over a distribution', () => {
		const samples = values(`x = uniform(0, 100000)\n${FED_TOTAL.replace('income', 'x')}`);
		const taxLine = samples.find((l) => l.raw.includes('bracket'));
		if (taxLine?.summary?.kind !== 'dist') throw new Error('expected dist');
		const taxMean = taxLine.summary.mean;
		const refLine = makeEngine({ N: 50000, seed: 1 })
			.evalSheet(`x = uniform(0, 100000)\n${FED_TOTAL.replace('income', 'x')}`)
			.lines.find((l) => l.raw.includes('bracket'));
		if (refLine?.summary?.kind !== 'dist') throw new Error('ref expected dist');
		const refMean = refLine.summary.mean;
		expect(Math.abs(taxMean - refMean)).toBeLessThan(200);
	});
	it('broadcasts marginal rate over a distribution', () => {
		const r = one('bracket(uniform(0, 200000), 100000: 10%, 150000: 20%, Infinity: 30%)');
		expect(r.isDist).toBe(true);
	});
});

describe('bracket(): tiered cloud pricing (rates with units)', () => {
	it('first-N-free, then marginal per-request', () => {
		// 5000 req: all free (under the 10k threshold)
		expect(
			num('bracket(5000 req, 10000 req: 0 $/req, Infinity req: 0.001 $/req, total=yes) in $')
		).toBeCloseTo(0, 6);
		// 20_000 req: 10k free + 10k * 0.001 = 10
		expect(
			num('bracket(20000 req, 10000 req: 0 $/req, Infinity req: 0.001 $/req, total=yes) in $')
		).toBeCloseTo(10, 6);
	});
	it('marginal rate carries the rate units', () => {
		const r = one(
			'bracket(50000 req, 10000 req: 0 $/req, 100000 req: 0.001 $/req, Infinity req: 0.0005 $/req) in $/req'
		);
		expect(r.display?.text).toMatch(/req/);
	});
	it('rejects tiers whose rates disagree in dimension', () => {
		expect(
			values('bracket(50, 100: 10%, 200: 0.001 $/req, Infinity: 0.0005 $/req)')[0].error
		).toMatch(/different units from tier 1/);
	});
});

describe('bracket(): unit & validation errors', () => {
	it('rejects a tier whose bound has different units from x', () => {
		expect(values('bracket(50 m, 100 s: 25%, Infinity: 10%)')[0].error).toMatch(
			/different units from x/
		);
	});
	it('rejects non-monotonic bounds', () => {
		expect(values('bracket(500, 100: 10%, 50: 20%, Infinity: 30%)')[0].error).toMatch(
			/below previous/
		);
	});
	it('rejects a bare-weight top tier', () => {
		expect(values('bracket(50, 100: 10%, Infinity:)')[0].error).toMatch(/top tier/);
	});
	it('rejects an unknown named argument', () => {
		expect(values('bracket(50, 100: 10%, Infinity: 20%, foo=yes)')[0].error).toMatch(
			/only 'total'/
		);
	});
	it('rejects an unparseable total flag', () => {
		expect(values('bracket(50, 100: 10%, Infinity: 20%, total=maybe)')[0].error).toMatch(
			/expected yes\/no/
		);
	});
	it('rejects calls with no tiers', () => {
		expect(values('bracket(50)')[0].error).toMatch(/at least one tier/);
	});
});

describe('bracket(): weight:value generalisation', () => {
	it('bare weight: is rejected by the parser for non-final positions in any call', () => {
		expect(values('mixture(0.5:, 0.5: 1)')[0].error).toMatch(/last argument/);
		expect(values('discrete(0.5:, 0.5: 1)')[0].error).toMatch(/last argument/);
	});
});
