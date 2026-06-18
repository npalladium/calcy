<script lang="ts">
import type { SensitivityEntry } from '$lib/engine';
import type { EngineClient } from '$lib/engine/client';

// Which inputs drive the selected distribution's variance.
let {
	engine,
	index,
	tick
}: { engine: EngineClient; index: number; tick: number } = $props();

let entries = $state<SensitivityEntry[]>([]);

$effect(() => {
	void index;
	void tick; // re-fetch after each re-eval (seed/sample changes)
	engine.sensitivity(index).then((e) => {
		entries = e ?? [];
	});
});
</script>

{#if entries.length}
	<div class="sens">
		<h3>Sensitivity</h3>
		<ul>
			{#each entries as e (e.name)}
				<li>
					<span class="name">{e.name}</span>
					<span
						class="bar"
						role="meter"
						aria-label="{e.name} variance share"
						aria-valuenow={Math.round(e.r2 * 100)}
						aria-valuemin={0}
						aria-valuemax={100}
					><span class="fill" style="width:{Math.round(e.r2 * 100)}%"></span></span>
					<span class="pct">{Math.round(e.r2 * 100)}%</span>
				</li>
			{/each}
		</ul>
		<p class="note">share of output variance explained (r²)</p>
	</div>
{/if}

<style>
	.sens h3 {
		margin: 0.25rem 0;
		color: var(--accent-soft);
		font-weight: 600;
		font-size: 0.85rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	li {
		display: grid;
		grid-template-columns: 5rem 1fr 2.5rem;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}
	.name {
		font-family: var(--font-mono);
		color: var(--accent-soft);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bar {
		height: 8px;
		background: var(--surface-2);
		border-radius: 4px;
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--color-brand);
	}
	.pct {
		text-align: right;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}
	.note {
		margin: 0.4rem 0 0;
		color: var(--text-faint);
		font-size: 0.72rem;
	}
</style>
