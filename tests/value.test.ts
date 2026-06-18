import { describe, expect, it } from 'vitest';
import {
	dimDiv,
	dimEq,
	dimIsZero,
	dimMul,
	dimPow,
	dimToString,
	dimZero,
	isScalar,
	timeExp,
	type Value
} from '../src/lib/engine/value';

describe('dimension algebra', () => {
	it('dimZero is empty', () => {
		expect(dimZero()).toEqual({});
		expect(dimIsZero(dimZero())).toBe(true);
		expect(dimIsZero({ length: 1 })).toBe(false);
	});

	it('dimMul adds exponents and drops zeros', () => {
		expect(dimMul({ length: 1 }, { length: 1 })).toEqual({ length: 2 });
		expect(dimMul({ length: 1 }, { time: -1 })).toEqual({ length: 1, time: -1 });
		expect(dimMul({ length: 1 }, { length: -1 })).toEqual({}); // cancels
		expect(dimMul({}, { mass: 1 })).toEqual({ mass: 1 });
	});

	it('dimDiv subtracts exponents and drops zeros', () => {
		expect(dimDiv({ length: 1 }, { time: 1 })).toEqual({ length: 1, time: -1 });
		expect(dimDiv({ length: 1 }, { length: 1 })).toEqual({});
		expect(dimDiv({ req: 1, time: -1 }, { time: -1 })).toEqual({ req: 1 });
	});

	it('dimPow scales exponents; power 0 is dimensionless', () => {
		expect(dimPow({ length: 1, time: -1 }, 2)).toEqual({ length: 2, time: -2 });
		expect(dimPow({ length: 2 }, 0.5)).toEqual({ length: 1 });
		expect(dimPow({ length: 1, mass: 2 }, 0)).toEqual({});
	});

	it('dimEq compares ignoring absent/zero entries', () => {
		expect(dimEq({ length: 1 }, { length: 1 })).toBe(true);
		expect(dimEq({}, {})).toBe(true);
		expect(dimEq({ length: 1 }, { length: 2 })).toBe(false);
		expect(dimEq({ length: 1 }, { mass: 1 })).toBe(false);
		expect(dimEq({ length: 1, time: -1 }, { time: -1, length: 1 })).toBe(true);
		expect(dimEq({ length: 1 }, {})).toBe(false);
	});

	it('dimToString renders base symbols, exponents, and sorted order', () => {
		expect(dimToString({})).toBe('');
		expect(dimToString({ length: 1 })).toBe('m');
		expect(dimToString({ mass: 1 })).toBe('kg');
		expect(dimToString({ time: 1 })).toBe('s');
		expect(dimToString({ current: 1 })).toBe('A');
		expect(dimToString({ temperature: 1 })).toBe('K');
		expect(dimToString({ amount: 1 })).toBe('mol');
		expect(dimToString({ luminosity: 1 })).toBe('cd');
		expect(dimToString({ data: 1 })).toBe('bit');
		expect(dimToString({ length: 2 })).toBe('m^2');
		// negative exponents render as a `/` denominator, not `^-1`
		expect(dimToString({ length: 1, time: -1 })).toBe('m/s');
		expect(dimToString({ length: 1, time: -2 })).toBe('m/s^2');
		expect(dimToString({ mass: 1, length: -1, time: -1 })).toBe('kg/(m s)');
		expect(dimToString({ time: -1 })).toBe('1/s');
		// non-base keys (counts/currency) render verbatim; currency keys use their symbol
		expect(dimToString({ req: 1 })).toBe('req');
		expect(dimToString({ usd: 1, time: -1 })).toBe('$/s');
	});

	it('isScalar distinguishes deterministic from sampled values', () => {
		const scalar: Value = { dim: {}, scalar: 5 };
		const dist: Value = { dim: {}, samples: new Float64Array([1, 2, 3]) };
		expect(isScalar(scalar)).toBe(true);
		expect(isScalar(dist)).toBe(false);
		expect(isScalar({ dim: {}, scalar: 0 })).toBe(true); // 0 is still a scalar
	});

	it('timeExp reads the time exponent (0 when absent)', () => {
		expect(timeExp({ time: -1 })).toBe(-1);
		expect(timeExp({ time: 2 })).toBe(2);
		expect(timeExp({ length: 1 })).toBe(0);
		expect(timeExp({})).toBe(0);
	});
});
