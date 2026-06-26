<script lang="ts">
import type { LineResult } from '$lib/engine';

let {
	lines,
	selected,
	onselect,
	blank = false
}: {
	lines: LineResult[];
	selected?: number;
	onselect?: (index: number) => void;
	// True when the sheet is empty: the Notepad onboarding is already on screen,
	// so we leave the grid as bare headers rather than add a third "no results
	// yet" message to the empty panes.
	blank?: boolean;
} = $props();

type Kind = 'error' | 'dist' | 'rate' | 'point' | '';
interface Row {
	index: number;
	line: number;
	name: string;
	expr: string;
	result: string;
	kind: Kind;
	note: string;
	detail: string; // raw developer error, shown on hover when a hint is present
}

// Only value/unit-def lines are interesting in the grid.
const grid = $derived<Row[]>(
	lines
		.filter((l) => l.kind === 'value' || l.kind === 'unitdef')
		.map((l) => ({
			index: l.index,
			line: l.index + 1,
			name: l.name ?? '',
			expr: l.raw.trim(),
			result: l.error ? '' : (l.display?.text ?? ''),
			kind: (l.error ? 'error' : l.isDist ? 'dist' : l.isRate ? 'rate' : (l.display?.kind ?? '')) as Kind,
			note: l.errorHint ?? l.error ?? l.comment ?? '',
			detail: l.errorHint ? (l.error ?? '') : ''
		}))
);
</script>

<div class="grid-wrap">
	<table>
		<thead>
			<tr>
				<th class="num">#</th>
				<th>name</th>
				<th>expression</th>
				<th class="r">result</th>
				<th>kind</th>
				<th>note</th>
			</tr>
		</thead>
		<tbody>
			{#each grid as row (row.index)}
				<tr
					class:sel={row.index === selected}
					class:err={row.kind === 'error'}
					onclick={() => onselect?.(row.index)}
				>
					<td class="num">{row.line}</td>
					<td class="name">{row.name}</td>
					<td class="expr">{row.expr}</td>
					<td class="r result kind-{row.kind}">{row.result}</td>
					<td><span class="tag kind-{row.kind}">{row.kind}</span></td>
					<td class="note" title={row.detail || undefined}>{row.note}</td>
				</tr>
			{:else}
				{#if !blank}
					<tr><td class="empty" colspan="6">no results yet</td></tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style>
	.grid-wrap {
		height: 100%;
		min-height: 200px;
		overflow: auto;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface-1);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}
	thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		text-align: left;
		background: var(--surface-1);
		color: var(--text-muted);
		font-weight: 500;
		padding: 0.35rem 0.5rem;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}
	th.r,
	td.r {
		text-align: right;
	}
	td {
		padding: 0.3rem 0.5rem;
		border-bottom: 1px solid var(--surface-2);
		color: var(--text-2);
		max-width: 16rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	tbody tr {
		cursor: pointer;
	}
	tbody tr:hover {
		background: var(--surface-1);
	}
	tbody tr.sel {
		background: var(--surface-2);
	}
	.num {
		color: var(--text-faint);
		text-align: right;
		width: 2.5rem;
	}
	.name {
		color: var(--accent-soft);
	}
	.result {
		font-weight: 500;
	}
	.kind-point {
		color: var(--c-value);
	}
	.kind-rate {
		color: var(--c-rate);
	}
	.kind-dist {
		color: var(--c-dist);
	}
	.kind-error,
	tr.err .result {
		color: var(--c-error);
	}
	.tag {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		opacity: 0.8;
	}
	.note {
		color: var(--text-muted);
	}
	.empty {
		text-align: center;
		color: var(--text-faint);
		padding: 1rem;
	}
</style>
