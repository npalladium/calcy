import { describe, expect, it } from 'vitest';
import { num } from './helpers';

// Hex (`0x…`) and binary (`0b…`) integer literals. Lexed as a dimensionless
// `num` token before the decimal path, so they compose with arithmetic and
// units exactly like any other number.

describe('hex and binary integer literals', () => {
	it('parses hex literals', () => {
		expect(num('0xFF')).toBe(255);
	});

	it('parses binary literals', () => {
		expect(num('0b1010')).toBe(10);
	});

	it('allows `_` separators in hex literals', () => {
		expect(num('0xFF_FF')).toBe(65535);
	});

	it('allows `_` separators in binary literals', () => {
		expect(num('0b1000_0001')).toBe(129);
	});

	it('mixes hex and binary literals in arithmetic', () => {
		expect(num('0x10 + 0b10')).toBe(18);
	});

	it('works as a magnitude with a unit', () => {
		expect(num('0x10 kg')).toBe(16);
	});
});
