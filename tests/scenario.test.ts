import { describe, expect, it } from 'vitest';
import type { ScenarioSummary } from '../src/lib/engine/mc';
import { one, values } from './helpers';

// scenario[axis](label: expr, …) — the inline constructor. A value gains one
// named axis whose coords are labelled expressions; each coord holds a full
// scalar/distribution cell. See docs/plans/scenarios.md.

const scenarioOf = (src: string): ScenarioSummary => {
	const l = one(src);
	if (l.error) throw new Error(`${src} → ${l.error}`);
	if (l.summary?.kind !== 'scenario') throw new Error(`expected scenario for: ${src}`);
	return l.summary;
};

// Point values per cell, row-major over the axes.
const cellValues = (src: string): number[] =>
	scenarioOf(src).cells.map((c) => (c.kind === 'point' ? c.value : Number.NaN));

describe('scenario[axis](...) inline constructor', () => {
	it('builds a one-axis grid with the coords in author order', () => {
		const s = scenarioOf('scenario[case](low: 8, base: 10, high: 14)');
		expect(s.axes).toHaveLength(1);
		expect(s.axes[0].name).toBe('case');
		expect(s.axes[0].coords).toEqual(['low', 'base', 'high']);
		expect(s.cells).toHaveLength(3);
		expect(s.cells.map((c) => (c.kind === 'point' ? c.value : Number.NaN))).toEqual([8, 10, 14]);
	});

	it('carries a shared unit onto every cell', () => {
		const s = scenarioOf('scenario[case](low: 8 $, base: 10 $, high: 14 $)');
		expect(s.dim).toEqual({ usd: 1 });
		expect(s.cells.map((c) => (c.kind === 'point' ? c.value : Number.NaN))).toEqual([8, 10, 14]);
	});

	it('holds distribution cells, each summarized independently', () => {
		const s = scenarioOf('scenario[case](low: normal(10, 1), high: normal(100, 5))');
		expect(s.cells).toHaveLength(2);
		expect(s.cells[0].kind).toBe('dist');
		expect(s.cells[1].kind).toBe('dist');
	});

	it('renders a compact one-line label prefixed by the axis name', () => {
		const l = one('scenario[case](low: 8 $, base: 10 $, high: 14 $)');
		expect(l.display?.kind).toBe('scenario');
		expect(l.display?.axes?.[0]).toEqual({ name: 'case', coords: ['low', 'base', 'high'] });
		expect(l.display?.cells).toHaveLength(3);
		expect(l.display?.text).toBe('case: low=$8.00, base=$10.00, high=$14.00');
	});

	it('is assignable and re-usable by name', () => {
		const [decl] = values('tier = scenario[plan](basic: 5 $, pro: 20 $)');
		expect(decl.name).toBe('tier');
		expect(decl.summary?.kind).toBe('scenario');
	});

	it('rejects coords with mismatched units', () => {
		expect(values('scenario[case](low: 8 $, base: 10 kg)')[0].error).toMatch(/different units/);
	});

	it('rejects a duplicate coord label', () => {
		expect(values('scenario[case](low: 8, low: 9)')[0].error).toMatch(/duplicate coord/);
	});

	it('rejects a missing axis name', () => {
		expect(values('scenario[](low: 8)')[0].error).toMatch(/axis name/);
	});

	it('rejects an empty coord list', () => {
		expect(values('scenario[case]()')[0].error).toMatch(/at least one coord/);
	});
});

describe('scenario arithmetic (align / broadcast / cross)', () => {
	it('broadcasts a scalar across every coord', () => {
		expect(cellValues('scenario[case](low: 8, base: 10, high: 14) * 2')).toEqual([16, 20, 28]);
		expect(cellValues('2 * scenario[case](low: 8, base: 10, high: 14)')).toEqual([16, 20, 28]);
	});

	it('aligns (zips) two grids sharing an axis', () => {
		const s = scenarioOf(
			'scenario[case](low: 8, base: 10, high: 14) - scenario[case](low: 1, base: 2, high: 4)'
		);
		expect(s.axes).toHaveLength(1);
		expect(s.axes[0].coords).toEqual(['low', 'base', 'high']);
		expect(s.cells.map((c) => (c.kind === 'point' ? c.value : Number.NaN))).toEqual([7, 8, 10]);
	});

	it('crosses two grids with different axes (Cartesian, row-major)', () => {
		const s = scenarioOf('scenario[case](low: 1, high: 2) * scenario[geo](us: 10, eu: 20)');
		expect(s.axes.map((a) => a.name)).toEqual(['case', 'geo']);
		// row-major over [case, geo]: (low,us) (low,eu) (high,us) (high,eu)
		expect(s.cells.map((c) => (c.kind === 'point' ? c.value : Number.NaN))).toEqual([
			10, 20, 20, 40
		]);
	});

	it('carries units through a broadcast', () => {
		const s = scenarioOf('scenario[case](low: 8, base: 10, high: 14) * (1 $)');
		expect(s.dim).toEqual({ usd: 1 });
		expect(s.cells.map((c) => (c.kind === 'point' ? c.value : Number.NaN))).toEqual([8, 10, 14]);
	});

	it('negates and powers cell-by-cell', () => {
		expect(cellValues('-scenario[case](low: 8, high: 14)')).toEqual([-8, -14]);
		expect(cellValues('scenario[case](low: 2, high: 3) ^ 2')).toEqual([4, 9]);
	});

	it('rejects an align whose coords differ under a shared axis name', () => {
		const err = values('scenario[case](low: 8, base: 10) + scenario[case](low: 1, high: 2)')[0]
			.error;
		expect(err).toMatch(/axis 'case': coords differ/);
	});

	it('caps the cell count on a large cross', () => {
		const coords = (prefix: string) =>
			Array.from({ length: 17 }, (_, i) => `${prefix}${i}: 1`).join(', ');
		const src = `scenario[a](${coords('a')}) * scenario[b](${coords('b')})`; // 17 × 17 = 289
		expect(values(src)[0].error).toMatch(/too large: 289 cells/);
	});
});
