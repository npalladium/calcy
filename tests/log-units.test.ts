import { describe, expect, it } from 'vitest';
import { num, one } from './helpers';

// EE proposal, Primitive B — logarithmic (ratio) units, conversion-first (stance 1).
//
// dB/dBm/dBW eagerly linearise: `x dBm` → ref·10^(x/10) in canonical base units,
// so ordinary (linear) arithmetic flows through them. Conversion `P in dBm` undoes
// the log: displayed = factor·log10(base / ref). Power-domain only (factor 10);
// amplitude dB (dBV, factor 20) is deliberately deferred (the absolute-vs-amplitude
// ambiguity, mirroring the affine phase-1/phase-2 split).

describe('dBm ↔ watts', () => {
	it('0 dBm is 1 mW', () => {
		expect(num('0 dBm in W')).toBeCloseTo(1e-3, 12);
		expect(num('0 dBm in mW')).toBeCloseTo(1, 9);
	});

	it('every +10 dB is ×10 power', () => {
		expect(num('10 dBm in W')).toBeCloseTo(1e-2, 12);
		expect(num('20 dBm in W')).toBeCloseTo(0.1, 12);
		expect(num('30 dBm in W')).toBeCloseTo(1, 9);
		expect(num('-30 dBm in W')).toBeCloseTo(1e-6, 12);
	});

	it('watts convert back to dBm', () => {
		expect(num('1 mW in dBm')).toBeCloseTo(0, 9);
		expect(num('0.1 W in dBm')).toBeCloseTo(20, 9);
		expect(num('1 W in dBm')).toBeCloseTo(30, 9);
	});
});

describe('dBW ↔ watts', () => {
	it('0 dBW is 1 W; +30 dBW is 1 kW', () => {
		expect(num('0 dBW in W')).toBeCloseTo(1, 9);
		expect(num('30 dBW in W')).toBeCloseTo(1000, 6);
	});

	it('0 dBW equals 30 dBm (same power)', () => {
		expect(num('0 dBW in W')).toBeCloseTo(num('30 dBm in W'), 9);
		expect(num('1 W in dBW')).toBeCloseTo(0, 9);
	});
});

describe('bare dB is a dimensionless power ratio', () => {
	it('x dB is 10^(x/10)', () => {
		expect(num('0 dB')).toBeCloseTo(1, 12);
		expect(num('10 dB')).toBeCloseTo(10, 9);
		expect(num('3 dB')).toBeCloseTo(1.99526, 4);
		expect(num('-3 dB')).toBeCloseTo(0.501187, 5);
	});

	it('a ratio converts back to dB', () => {
		expect(num('100 in dB')).toBeCloseTo(20, 9);
		expect(num('2 in dB')).toBeCloseTo(3.0103, 4);
	});
});

describe('round-trips', () => {
	it('power round-trips through dBm', () => {
		expect(num('0.25 W in dBm in W')).toBeCloseTo(0.25, 9);
		expect(num('17 dBm in W in dBm')).toBeCloseTo(17, 9);
	});

	it('a ratio round-trips through dB (forward apply, then display)', () => {
		// `6 dB` linearises to ×3.98; displaying that back in dB returns 6.
		expect(num('6 dB in dB')).toBeCloseTo(6, 9);
		expect(num('-10 dB in dB')).toBeCloseTo(-10, 9);
	});
});

describe('linear arithmetic flows (conversion-first stance)', () => {
	it('a link budget composes gain/loss by × and ÷', () => {
		// tx 20 dBm = 0.1 W, +12 dB antenna gain, −80 dB path loss → −48 dBm
		expect(num('0.1 W * (12 dB) / (80 dB) in dBm')).toBeCloseTo(-48, 6);
	});

	it('two equal incoherent powers sum to +3 dB', () => {
		expect(num('(0.1 W + 0.1 W) in dBm')).toBeCloseTo(23.0103, 4);
	});
});

describe('uncertainty propagates through the dB display', () => {
	it('a power distribution shows a monotone dBm interval', () => {
		// (1 to 100) mW spans roughly 0…20 dBm, centred near 10 dBm.
		const d = one('(1 to 100) mW in dBm').display;
		expect(d?.kind).toBe('dist');
		expect(d?.unit).toBe('dBm');
		const p5 = Number(d?.p5);
		const p50 = Number(d?.p50);
		const p95 = Number(d?.p95);
		expect(p5).toBeLessThan(p50);
		expect(p50).toBeLessThan(p95);
		expect(p50).toBeCloseTo(10, 0);
	});
});
