import { describe, expect, it } from 'vitest';
import { DEFAULT_UNITS as U } from '../src/lib/engine/units';
import { num } from './helpers';

const scale = (n: string) => U.get(n)?.scale;
const dim = (n: string) => U.get(n)?.dim;

describe('SI prefix expansion', () => {
	it('expands length, time, mass, frequency, pressure, energy, amount', () => {
		expect(U.get('km')).toEqual({ dim: { length: 1 }, scale: 1000 });
		expect(U.get('µm')).toEqual({ dim: { length: 1 }, scale: 1e-6 });
		expect(U.get('um')).toEqual({ dim: { length: 1 }, scale: 1e-6 });
		expect(U.get('ns')).toEqual({ dim: { time: 1 }, scale: 1e-9 });
		expect(scale('mg')).toBeCloseTo(1e-6, 12); // milli-gram in kg
		expect(scale('GHz')).toBe(1e9);
		expect(dim('GHz')).toEqual({ time: -1 });
		expect(scale('kPa')).toBe(1e3);
		expect(scale('MJ')).toBe(1e6);
		expect(scale('mmol')).toBeCloseTo(1e-3, 12);
		expect(scale('hPa')).toBe(100); // hectopascal survives
	});
});

describe('no collisions broke core units', () => {
	it.each([
		['m', { length: 1 }, 1],
		['s', { time: 1 }, 1],
		['kg', { mass: 1 }, 1],
		['min', { time: 1 }, 60],
		['day', { time: 1 }, 86400],
		['cd', { luminosity: 1 }, 1],
		['mol', { amount: 1 }, 1],
		['B', { data: 1 }, 8]
	])('%s', (name, d, s) => {
		expect(dim(name)).toEqual(d);
		expect(scale(name)).toBe(s);
	});
	it('Pa is pressure and T is magnetic flux density', () => {
		expect(dim('Pa')).toEqual({ mass: 1, length: -1, time: -2 });
		expect(dim('T')).toEqual({ mass: 1, time: -2, current: -1 });
	});
});

describe('customary / imperial conversions', () => {
	it.each([
		['1 ft in cm', 30.48],
		['1 mi in km', 1.609344],
		['1 lb in g', 453.59237],
		['1 oz in g', 28.349523125],
		['1 gallon in L', 3.785411784],
		['1 cup in mL', 236.5882365],
		['1 acre in m2', 4046.8564224],
		['1 stone in kg', 6.35029318]
	])('%s ≈ %d', (q, expected) => {
		expect(Math.abs(num(q) - expected) / expected).toBeLessThan(0.005);
	});
});

describe('physical units & constants', () => {
	it.each([
		['1 hp in W', 745.7],
		['1 atm in kPa', 101.325],
		['1 kWh in MJ', 3.6],
		['1 cal in J', 4.184],
		['180 deg in rad', Math.PI],
		['1 turn in deg', 360],
		['gravity in m/s^2', 9.80665],
		['1 knot in kph', 1.852]
	])('%s ≈ %d', (q, expected) => {
		expect(Math.abs(num(q) - expected) / expected).toBeLessThan(0.005);
	});
	it('speed of light expressed in km/h', () => {
		expect(num('1 c in kph')).toBeCloseTo(1.0792528488e9, -7);
	});
});

describe('data units (decimal, binary, capitalisation, rates)', () => {
	it.each([
		['1 MB in KB', 1000],
		['1 KB in byte', 1000],
		['1 KiB in byte', 1024],
		['1 MiB in KiB', 1024],
		['1 GiB in MiB', 1024],
		['1 TB in GB', 1000],
		['1 Gbps in Mbps', 1000]
	])('%s = %d', (q, expected) => {
		expect(num(q)).toBeCloseTo(expected, 6);
	});
});

describe('currencies are independent dimensions', () => {
	it.each(['5 $', '5 £', '5 ¥', '5 €'])('%s is a magnitude-5 currency value', (q) => {
		expect(num(q)).toBe(5);
	});
	it('currency labels round-trip through the dimension', () => {
		expect(num('5 dollars in $')).toBe(5);
		expect(num('5 euros in €')).toBe(5);
	});
	it('cannot add across currencies', () => {
		// $ and € are different base dims -> incompatible
		const e = U.get('$');
		const f = U.get('€');
		expect(e?.dim).not.toEqual(f?.dim);
	});
});
