<script lang="ts">
import type { DisplayValue, LineResult, RatePeriod } from '$lib/engine';

let {
	line,
	accumulate
}: {
	line: LineResult;
	accumulate: (
		index: number,
		period: RatePeriod,
		count: number,
		growth?: number
	) => Promise<DisplayValue | null>;
} = $props();

let period = $state<RatePeriod>('day');
let count = $state(1);
let growthOn = $state(false);
let growthPct = $state(10);
let total = $state<DisplayValue | null>(null);

const periods: RatePeriod[] = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];

async function recompute() {
	total = await accumulate(line.index, period, count, growthOn ? growthPct / 100 : 0);
}

// Recompute the accumulation whenever the inputs or the line change.
$effect(() => {
	void line.index;
	void period;
	void count;
	void growthOn;
	void growthPct;
	recompute();
});
</script>

<div class="card">
	<h3>Rate card</h3>
	<table>
		<tbody>
			{#each line.rateCard ?? [] as entry (entry.period)}
				<tr>
					<th>per {entry.period}</th>
					<td>{entry.display.text}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="accumulate">
		<h4>Accumulate over</h4>
		<div class="controls">
			<input type="number" min="0" step="any" bind:value={count} aria-label="count" />
			<select bind:value={period} aria-label="period">
				{#each periods as p (p)}
					<option value={p}>{p}{count === 1 ? '' : 's'}</option>
				{/each}
			</select>
		</div>
		<label class="growth">
			<input type="checkbox" bind:checked={growthOn} />
			growing
			<input
				type="number"
				step="any"
				bind:value={growthPct}
				disabled={!growthOn}
				aria-label="growth percent per period"
			/>% per {period}
		</label>
		{#if total}
			<div class="total">= {total.text}</div>
		{/if}
	</div>
</div>

<style>
	.card {
		font-size: 0.85rem;
	}
	h3,
	h4 {
		margin: 0.25rem 0;
		color: var(--accent-soft);
		font-weight: 600;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
	}
	th {
		text-align: left;
		color: var(--text-muted);
		font-weight: 400;
		padding: 0.15rem 0.5rem 0.15rem 0;
	}
	td {
		text-align: right;
		padding: 0.15rem 0;
	}
	.accumulate {
		margin-top: 0.75rem;
		border-top: 1px solid var(--border);
		padding-top: 0.5rem;
	}
	.controls {
		display: flex;
		gap: 0.4rem;
	}
	input,
	select {
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text);
		border-radius: 6px;
		padding: 0.25rem 0.4rem;
	}
	.controls input {
		width: 6rem;
	}
	.growth {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-2);
	}
	.growth input[type='number'] {
		width: 4rem;
	}
	.growth input[type='number']:disabled {
		opacity: 0.4;
	}
	.total {
		margin-top: 0.5rem;
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--c-value-soft);
	}
</style>
