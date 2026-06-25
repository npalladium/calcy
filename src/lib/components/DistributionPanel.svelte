<script lang="ts">
import type { LineResult, NumberFormat } from '$lib/engine';
import { formatNumber } from '$lib/engine/format';
import Sparkline from './Sparkline.svelte';

let { line, fmt = 'auto' }: { line: LineResult; fmt?: NumberFormat } = $props();

const dist = $derived(line.summary?.kind === 'dist' ? line.summary : null);
const unit = $derived(line.display?.unit ?? '');

const stats = $derived(
	dist
		? ([
				['mean', dist.mean],
				['std dev', dist.sd],
				['min', dist.min],
				['p5', dist.p5],
				['p25', dist.p25],
				['median', dist.p50],
				['p75', dist.p75],
				['p95', dist.p95],
				['max', dist.max]
			] as [string, number][])
		: []
);

const cell = (n: number) => `${formatNumber(n, fmt)}${unit ? ` ${unit}` : ''}`;
</script>

{#if dist}
	<div class="dist">
		{#if line.display?.kind === 'dist'}
			<p class="plain">
				Most likely <strong>{line.display?.p50}{unit ? ` ${unit}` : ''}</strong>—usually between
				<strong>{line.display?.p5}</strong> and <strong>{line.display?.p95}</strong>{unit
					? ` ${unit}`
					: ''}.
			</p>
		{:else}
			<!-- A distribution that collapsed to a single value (e.g. x − x): no
			     spread, so there's no "usually between" range to show. `text` already
			     carries the unit. -->
			<p class="plain">
				Always <strong>{line.display?.text}</strong>—no variation.
			</p>
		{/if}
		<Sparkline hist={dist.hist} width={280} height={64} />
		<details>
			<summary>All statistics</summary>
			<table>
				<tbody>
					{#each stats as [name, value] (name)}
						<tr class:hl={name === 'median'}>
							<th>{name}</th>
							<td>{cell(value)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</details>
	</div>
{:else}
	<p class="muted">Select a distribution-valued line to see its full stats.</p>
{/if}

<style>
	.dist {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.plain {
		margin: 0;
		font-family:
			system-ui,
			sans-serif;
		font-size: 0.9rem;
		line-height: 1.4;
		color: var(--text-2);
	}
	.plain strong {
		color: var(--text);
		font-weight: 600;
	}
	details > summary {
		cursor: pointer;
		color: var(--text-muted);
		font-size: 0.74rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.35rem;
	}
	details > summary:hover {
		color: var(--text-2);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.82rem;
	}
	th {
		text-align: left;
		color: var(--text-muted);
		font-weight: 400;
		padding: 0.2rem 0.5rem 0.2rem 0;
	}
	td {
		text-align: right;
		padding: 0.2rem 0;
		color: var(--text-2);
	}
	tr.hl th,
	tr.hl td {
		color: var(--c-dist);
		font-weight: 600;
	}
	tr:not(:last-child) th,
	tr:not(:last-child) td {
		border-bottom: 1px solid var(--surface-2);
	}
	.muted {
		color: var(--text-muted);
		font-size: 0.85rem;
		padding: 0.5rem;
	}
</style>
