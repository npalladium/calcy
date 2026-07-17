// Scenario axis resolution: given the axes of two operands, work out the result
// axes and, for each result cell, which cell of each operand feeds it. Pure
// combinatorics over `Axis` — no Value/sample knowledge. See
// docs/plans/scenarios.md ("Alignment rules").
//
// The three cases collapse to one rule on the *names* the author typed:
//   - same name in both  → align (zip): coords must match exactly, one shared
//     axis in the result.
//   - name in one only   → broadcast: the axis joins the result, the other
//     operand repeats across its coords.
//   - different names     → cross (Cartesian): both axes join the result.
// "align" is the only case that doesn't grow the result; broadcast and cross
// are the same mechanic (the result gains the axis), so they share a code path.

import type { Axis } from './value';

export interface ResolvedAxes {
	axes: Axis[]; // result axes, row-major
	// For each result cell (row-major over `axes`), the flat cell index into the
	// left / right operand. An operand with no axes is a single cell at index 0.
	leftIndex: number[];
	rightIndex: number[];
}

// Row-major strides for the given per-axis coord counts: strides[i] is the flat
// step per unit of axis i (last axis has stride 1).
function strides(sizes: number[]): number[] {
	const out = new Array<number>(sizes.length);
	let acc = 1;
	for (let i = sizes.length - 1; i >= 0; i--) {
		out[i] = acc;
		acc *= sizes[i];
	}
	return out;
}

// Decode a flat row-major index into a coord index per axis.
function decode(k: number, sizes: number[]): number[] {
	const out = new Array<number>(sizes.length);
	let rest = k;
	for (let i = sizes.length - 1; i >= 0; i--) {
		out[i] = rest % sizes[i];
		rest = Math.floor(rest / sizes[i]);
	}
	return out;
}

export function resolveAxes(aAxes: Axis[], bAxes: Axis[]): ResolvedAxes {
	// Result axes = left's axes, then any of right's axes whose name is new.
	// A shared name must have identical coords (labels + order) — a mismatch is
	// a hard error rather than a silent partial align.
	const axes: Axis[] = [...aAxes];
	for (const bx of bAxes) {
		const shared = axes.find((x) => x.name === bx.name);
		if (!shared) {
			axes.push(bx);
			continue;
		}
		if (
			shared.coords.length !== bx.coords.length ||
			shared.coords.some((c, i) => c !== bx.coords[i])
		)
			throw new Error(
				`axis '${bx.name}': coords differ (${shared.coords.join('/')} vs ${bx.coords.join('/')})`
			);
	}

	const sizes = axes.map((x) => x.coords.length);
	const total = sizes.reduce((n, s) => n * s, 1);
	// Where each result axis sits in each operand (−1 = absent, so that operand
	// doesn't advance along this axis — it broadcasts).
	const aPos = axes.map((x) => aAxes.findIndex((y) => y.name === x.name));
	const bPos = axes.map((x) => bAxes.findIndex((y) => y.name === x.name));
	const aStrides = strides(aAxes.map((x) => x.coords.length));
	const bStrides = strides(bAxes.map((x) => x.coords.length));

	const leftIndex = new Array<number>(total);
	const rightIndex = new Array<number>(total);
	for (let k = 0; k < total; k++) {
		const coord = decode(k, sizes);
		let ai = 0;
		let bi = 0;
		for (let d = 0; d < axes.length; d++) {
			if (aPos[d] >= 0) ai += coord[d] * aStrides[aPos[d]];
			if (bPos[d] >= 0) bi += coord[d] * bStrides[bPos[d]];
		}
		leftIndex[k] = ai;
		rightIndex[k] = bi;
	}
	return { axes, leftIndex, rightIndex };
}
