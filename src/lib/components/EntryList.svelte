<script module lang="ts">
export interface Entry {
	id: string;
	title: string;
	subtitle?: string;
	at?: number; // epoch ms — rendered as relative time when present
	current?: boolean;
}
</script>

<script lang="ts">
// Presentation-only: a list of clickable entries shared by the Sheets, History,
// and Templates panels. Each entry shows a title, optional subtitle, and either
// a preformatted time or a `at` timestamp (rendered relative). Per-row trailing
// controls are supplied by the caller via the `actions` snippet.
import type { Snippet } from 'svelte';
import { relativeTime } from '$lib/sheet/time';

let {
	items,
	empty = 'nothing here',
	onpick,
	actions
}: {
	items: Entry[];
	empty?: string;
	onpick: (id: string) => void;
	actions?: Snippet<[Entry]>;
} = $props();
</script>

<ul>
	{#each items as it (it.id)}
		<li class:current={it.current}>
			<button class="open" onclick={() => onpick(it.id)}>
				<span class="st">{it.title}{#if it.current}<span class="badge">current</span>{/if}</span>
				{#if it.subtitle}<span class="sn">{it.subtitle}</span>{/if}
				{#if it.at != null}<span class="when">{relativeTime(it.at, Date.now())}</span>{/if}
			</button>
			{#if actions}<div class="row-acts">{@render actions(it)}</div>{/if}
		</li>
	{:else}
		<li class="muted">{empty}</li>
	{/each}
</ul>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 100%;
	}
	li {
		display: flex;
		align-items: stretch;
		border-radius: 6px;
	}
	li.current {
		background: var(--surface-sel);
	}
	.open {
		flex: 1;
		min-width: 0;
		text-align: left;
		background: none;
		border: none;
		border-radius: 6px;
		padding: 0.35rem 0.4rem;
		color: var(--text);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.open:hover {
		background: var(--surface-3);
	}
	.st {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.badge {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-brand);
		border: 1px solid var(--border-accent);
		border-radius: 4px;
		padding: 0 0.25rem;
	}
	.sn {
		color: var(--text-muted);
		font-size: 0.75rem;
		font-family: var(--font-mono);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.when {
		color: var(--text-faint);
		font-size: 0.68rem;
	}
	.row-acts {
		display: flex;
		align-items: center;
	}
	.muted {
		color: var(--text-muted);
		font-size: 0.8rem;
	}
</style>
