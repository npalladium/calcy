// Pure serializers for exporting a sheet's text + results. No I/O — the shell
// (SheetController) wraps these in clipboard / file-download side effects.

import type { LineResult } from '$lib/engine';

// The sheet text with each evaluated line annotated inline: `→ result` for a
// value, `⚠ error` for a failure. Lines without a result pass through verbatim.
export function annotatedBody(body: string, results: LineResult[]): string {
	const byIndex = new Map(results.map((l) => [l.index, l]));
	return body
		.split('\n')
		.map((raw, i) => {
			const l = byIndex.get(i);
			if (l?.error) return `${raw}  ⚠ ${l.error}`;
			if (l?.kind === 'value' && l.display) return `${raw}  → ${l.display.text}`;
			return raw;
		})
		.join('\n');
}

// A filesystem-safe slug for a sheet title; always non-empty.
export function slugify(title: string): string {
	return (
		(title || 'sheet')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'sheet'
	);
}

function csvCell(s: string): string {
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// One row per evaluated line (values + unit defs), mirroring the results grid.
export function toCsv(results: LineResult[]): string {
	const header = ['line', 'name', 'expression', 'result', 'kind', 'note'];
	const rows = results
		.filter((l) => l.kind === 'value' || l.kind === 'unitdef')
		.map((l) => [
			String(l.index + 1),
			l.name ?? '',
			l.raw.trim(),
			l.error ? '' : (l.display?.text ?? ''),
			l.error ? 'error' : l.isDist ? 'dist' : l.isRate ? 'rate' : (l.display?.kind ?? ''),
			l.error ?? l.comment ?? ''
		]);
	return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

// Markdown wrapper around an already-annotated body.
export function toMarkdown(title: string, annotated: string): string {
	return `# ${title || 'Untitled'}\n\n\`\`\`\n${annotated}\n\`\`\`\n`;
}
