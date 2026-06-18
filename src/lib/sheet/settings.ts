// Pure parsing of persisted settings strings and custom-unit input. The DB
// stores everything as strings; these turn them into validated, typed values.

import type { NumberFormat } from '$lib/engine';

export interface ParsedSettings {
	monthDays?: number;
	yearDays?: number;
	samples?: number;
	numberFormat?: NumberFormat;
	mode?: 'notepad' | 'tape';
	// Confidence level used by `lo to hi` / `about` / `~` to map a symmetric
	// interval onto a normal/lognormal. In (0, 1). Default 0.90.
	confidence?: number;
	// Three-pane column widths in pixels plus per-column collapse flags;
	// persisted as a single `editor,gutter,inspector,ec,gc,ic` string so a
	// partial write can't leave the layout half-applied.
	layout?: {
		editor: number;
		gutter: number;
		inspector: number;
		editorCollapsed: boolean;
		gutterCollapsed: boolean;
		inspectorCollapsed: boolean;
	};
	debugAst: boolean;
}

const NUMBER_FORMATS: readonly string[] = ['auto', 'compact', 'newspaper', 'scientific'];

// Validate the raw string→string settings map into typed fields. Unknown or
// missing keys are simply omitted (the caller keeps its default), except
// `debugAst`, which is always resolved to a boolean.
export function parseSettings(raw: Record<string, string>): ParsedSettings {
	const out: ParsedSettings = { debugAst: raw.debugAst === 'true' };
	if (raw.monthDays) out.monthDays = Number(raw.monthDays);
	if (raw.yearDays) out.yearDays = Number(raw.yearDays);
	if (raw.samples) out.samples = Number(raw.samples);
	if (NUMBER_FORMATS.includes(raw.numberFormat))
		out.numberFormat = raw.numberFormat as NumberFormat;
	if (raw.mode === 'tape' || raw.mode === 'notepad') out.mode = raw.mode;
	if (raw.confidence) {
		const c = Number(raw.confidence);
		if (c > 0 && c < 1) out.confidence = c;
	}
	if (raw.layout) {
		const parts = raw.layout.split(',').map((s) => s.trim());
		if (parts.length === 3 && parts.every((s) => Number.isFinite(Number(s)) && Number(s) > 0)) {
			// Legacy 3-tuple: just widths, all expanded.
			out.layout = {
				editor: Number(parts[0]),
				gutter: Number(parts[1]),
				inspector: Number(parts[2]),
				editorCollapsed: false,
				gutterCollapsed: false,
				inspectorCollapsed: false
			};
		} else if (parts.length === 6) {
			// New 6-tuple: editor,gutter,inspector,ec,gc,ic.
			const [w, e, i, ec, gc, ic] = parts.map(Number);
			if (
				[w, e, i].every((n) => Number.isFinite(n) && n > 0) &&
				[ec, gc, ic].every((n) => n === 0 || n === 1)
			) {
				out.layout = {
					editor: w,
					gutter: e,
					inspector: i,
					editorCollapsed: !!ec,
					gutterCollapsed: !!gc,
					inspectorCollapsed: !!ic
				};
			}
		}
	}
	return out;
}

export type CustomUnitInput = { name: string; definition: string } | { error: string };

// Parse a `name = definition` (optionally `unit name = …`) custom-unit entry.
// Returns a structured error message rather than throwing.
export function parseCustomUnitInput(input: string): CustomUnitInput {
	const m = /^(?:unit\s+)?([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(input.trim());
	if (!m) return { error: 'format: name = definition (e.g. sprint = 2 week)' };
	return { name: m[1], definition: m[2] };
}
