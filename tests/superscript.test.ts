import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/lib/engine/parse';
import { num, one, text, values } from './helpers';

describe('superscript exponents — input (tokenizer)', () => {
	it('decodes a superscript run into `^` + a num token', () => {
		const t = tokenize('m²');
		expect(t.map((x) => ({ kind: x.kind, value: x.value }))).toEqual([
			{ kind: 'ident', value: 'm' },
			{ kind: 'op', value: '^' },
			{ kind: 'num', value: '2' }
		]);
	});
	it('decodes superscript minus + digits', () => {
		const t = tokenize('s⁻¹');
		expect(t.map((x) => ({ kind: x.kind, value: x.value }))).toEqual([
			{ kind: 'ident', value: 's' },
			{ kind: 'op', value: '^' },
			{ kind: 'num', value: '-1' }
		]);
	});
	it('decodes multi-digit superscript runs', () => {
		const t = tokenize('x¹²');
		expect(t.map((x) => ({ kind: x.kind, value: x.value }))).toEqual([
			{ kind: 'ident', value: 'x' },
			{ kind: 'op', value: '^' },
			{ kind: 'num', value: '12' }
		]);
	});
});

describe('superscript exponents — evaluate identically to `^`', () => {
	it('5 m² == 5 m^2', () => {
		expect(num('5 m²')).toBeCloseTo(num('5 m^2'));
	});
	it('9.8 m/s² == 9.8 m/s^2', () => {
		expect(num('9.8 m/s²')).toBeCloseTo(num('9.8 m/s^2'));
	});
	it('s⁻¹ == s^-1', () => {
		expect(num('1 s⁻¹ in Hz')).toBeCloseTo(num('1 s^-1 in Hz'));
	});
	it('10² == 100', () => {
		expect(num('10²')).toBe(100);
	});
	it('x² with x=3 == 9', () => {
		const last = (t: string) => Number(values(t).at(-1)?.display?.value);
		expect(last('x = 3\nx²')).toBe(9);
		expect(last('x = 3\nx²')).toBe(last('x = 3\nx^2'));
	});
	it('(1+2)² == 9', () => {
		expect(num('(1+2)²')).toBe(9);
	});
	it('cm³ == cm^3', () => {
		expect(num('1 cm³ in mL')).toBeCloseTo(num('1 cm^3 in mL'));
	});
	it('a leading superscript with no base does not crash — a parse error is acceptable', () => {
		expect(() => one('²5')).not.toThrow();
		expect(one('²5').error).toBeTruthy();
	});
});

describe('superscript exponents — output (display)', () => {
	it('renders m² and m/s² for integer exponents', () => {
		expect(text('(2 m)^2')).toBe('4 m²');
		expect(text('9.8 m/s^2')).toBe('9.8 m/s²');
	});
});
