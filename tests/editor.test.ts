import { describe, expect, it } from 'vitest';
import { collectVariables, functionInsertion, setLineConversion } from '../src/lib/editor';

describe('collectVariables', () => {
	it('collects assigned names in order', () => {
		expect(collectVariables('rate = 12_000 req/s\nload = 5')).toEqual(['rate', 'load']);
	});

	it('collects custom unit names', () => {
		expect(collectVariables('unit sprint = 2 week')).toEqual(['sprint']);
	});

	it('ignores names that appear only in comments', () => {
		expect(collectVariables('x = 1 # later use y = 2')).toEqual(['x']);
	});

	it('does not treat conversions or bare expressions as assignments', () => {
		expect(collectVariables('5 km in mi\nrate * 30 day')).toEqual([]);
	});

	it('dedupes redefinitions, keeping first position', () => {
		expect(collectVariables('a = 1\nb = 2\na = 3')).toEqual(['a', 'b']);
	});
});

describe('setLineConversion', () => {
	it('appends a conversion to a bare expression', () => {
		expect(setLineConversion('5 km', 'mi')).toBe('5 km in mi');
	});

	it('replaces an existing in/to conversion', () => {
		expect(setLineConversion('5 km in mi', 'm')).toBe('5 km in m');
		expect(setLineConversion('5 km to mi', 'm')).toBe('5 km in m');
	});

	it('clears the conversion when given an empty unit', () => {
		expect(setLineConversion('5 km in mi', '')).toBe('5 km');
	});

	it('preserves a trailing comment', () => {
		expect(setLineConversion('5 km # road', 'mi')).toBe('5 km in mi # road');
		expect(setLineConversion('5 km in mi # road', 'm')).toBe('5 km in m # road');
	});

	it('keeps an assignment intact', () => {
		expect(setLineConversion('rate = 12_000 req/s', 'req/day')).toBe(
			'rate = 12_000 req/s in req/day'
		);
	});

	it('does not mistake the unit "min" for the in keyword', () => {
		expect(setLineConversion('5 min', 'h')).toBe('5 min in h');
	});
});

describe('functionInsertion', () => {
	it('inserts the name with an opening paren and lands the cursor inside it', () => {
		expect(functionInsertion('normal')).toEqual({ insert: 'normal(', cursorOffset: 7 });
	});
});
