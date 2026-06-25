import { describe, expect, it } from 'vitest';
import { values } from './helpers';

// Regression: the closed-form arithmetic layer carries a parametric `meta` for
// analytical mean/p, but it must also *derive the sample array* using the real
// operator. A prior bug keyed sample derivation off the distribution family
// alone (`normal` → add, `lognormal` → multiply), so `normal − normal` added
// its samples and `lognormal / lognormal` multiplied them — leaving median /
// min / max / sparkline (everything that reads samples) wrong even though the
// analytical mean stayed right. See closed-form.ts `sampleFromMeta`.

const STAT = { N: 20000, seed: 7 };

const exact = (src: string): number => {
	const ls = values(src, STAT);
	const last = ls[ls.length - 1];
	if (last?.error) throw new Error(`${src} → ${last.error}`);
	if (last.summary?.kind === 'point') return last.summary.value;
	if (last.display?.value) return Number(last.display.value);
	throw new Error(`${src}: not a scalar`);
};

describe('closed-form sample derivation uses the real operator', () => {
	it('median(normal − normal) follows subtraction, not addition', () => {
		// N(100,10) − N(50,5): mean 50. Adding the samples would give ~150.
		expect(exact('median(normal(100, 10) - normal(50, 5))')).toBeCloseTo(50, -1);
	});

	it('median(lognormal / lognormal) is ~1, not the product', () => {
		// (1 to 100) / (1 to 100): μ cancels → median 1. Multiplying gives ~100.
		expect(exact('median((1 to 100) / (1 to 100))')).toBeCloseTo(1, 0);
	});

	it('correlation-by-reuse: x − x is identically 0', () => {
		expect(exact('x = normal(100, 10)\nmedian(x - x)')).toBe(0);
	});

	it('correlation-by-reuse: x / x is identically 1', () => {
		expect(exact('x = normal(100, 10)\nmedian(x / x)')).toBe(1);
	});

	it('normal / scalar divides the samples (median ~50), matching the mean', () => {
		expect(exact('median(normal(100, 10) / 2)')).toBeCloseTo(50, -1);
	});

	it('normal − scalar subtracts from the samples (median ~70)', () => {
		expect(exact('median(normal(100, 10) - 30)')).toBeCloseTo(70, -1);
	});
});
