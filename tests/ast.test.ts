import { describe, expect, it } from 'vitest';
import { astText, Engine, type LineResult } from '../src/lib/engine';
import { parseLine } from '../src/lib/engine/parse';

// The AST attached to LineResult is what the engine actually evaluated.
// astText() round-trips it into a readable s-expr form for the gutter.

const FAST = { N: 200, seed: 1, numberFormat: 'auto' as const };
function evalText(text: string): LineResult[] {
	return new Engine(FAST).evalSheet(text).lines;
}

describe('LineResult.ast', () => {
	it('attaches the parsed AST to value and assign lines', () => {
		const ls = evalText('5 km + 3 mi\nrate = 12_000 req/s');
		expect(ls[0].ast?.type).toBe('bin');
		expect(ls[1].ast?.type).toBe('bin');
		if (ls[0].ast?.type !== 'bin') throw new Error('expected bin');
		expect(ls[0].ast.op).toBe('+');
	});

	it('omits ast on blank and comment lines', () => {
		const ls = evalText('\n# hi\n1 + 1');
		expect(ls[0].ast).toBeUndefined();
		expect(ls[1].ast).toBeUndefined();
		expect(ls[2].ast?.type).toBe('bin');
	});

	it('attaches ast even when evaluation throws (parse-time error vs eval-time error)', () => {
		const ls = evalText('1 +');
		// parse error: no ast
		expect(ls[0].ast).toBeUndefined();
		expect(ls[0].error).toBeTruthy();
	});

	it('keeps ast when the line parses but eval fails (e.g. dim mismatch)', () => {
		const ls = evalText('5 km + 3 s');
		expect(ls[0].ast?.type).toBe('bin');
		expect(ls[0].error).toMatch(/incompatible/i);
	});

	it('survives structured-clone (JSON round-trip)', () => {
		const original = evalText('x = (800 to 1200) req/s\nx * 30 day')[0];
		const clone = JSON.parse(JSON.stringify(original));
		expect(clone.ast).toEqual(original.ast);
	});
});

describe('astText()', () => {
	function p(src: string) {
		const line = parseLine(src, { isUnit: () => false });
		if (line.type !== 'expr') throw new Error('expected expr');
		return astText(line.expr);
	}

	it('renders numbers', () => {
		expect(p('42')).toBe('42');
		expect(p('3.14')).toBe('3.14');
	});

	it('renders binary ops with parens', () => {
		expect(p('1 + 2')).toBe('(+ 1 2)');
		expect(p('5 km + 3 mi')).toBe('(+ (* 5 km) (* 3 mi))');
		expect(p('a * b')).toBe('(* a b)');
	});

	it('renders confidence intervals, conversion, negation', () => {
		expect(p('800 to 1200')).toBe('(ci 800 1200)');
		expect(p('1.2 GB in MB')).toBe('(convert (* 1.2 GB) MB)');
		expect(p('-x')).toBe('(- x)');
	});

	it('renders calls, named args, and weight:value pairs', () => {
		expect(p('pert(low=2, likely=3, high=8)')).toBe('(pert low=2 likely=3 high=8)');
		expect(p('discrete(60%: 12, 40%: 20)')).toBe('(discrete (* 60 %): 12 (* 40 %): 20)');
		expect(p('mean of (1 to 9)')).toBe('(mean (ci 1 9))');
	});
});
