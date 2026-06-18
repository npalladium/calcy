<script lang="ts">
// Presentation-only: revision history of the current sheet.
import type { SheetController } from '$lib/state/sheet.svelte';
import { relativeTime } from '$lib/sheet/time';
import EntryList, { type Entry } from './EntryList.svelte';
import FloatingPanel from './FloatingPanel.svelte';

let { c }: { c: SheetController } = $props();

const entries = $derived<Entry[]>(
	c.revisions.map((r) => ({
		id: String(r.id),
		title: relativeTime(r.saved_at, Date.now()),
		subtitle: r.snippet.replace(/\n/g, ' ') || '(empty)'
	}))
);
</script>

<FloatingPanel label="revision history">
	<div class="hist-head">
		<span class="fmt-label">revisions of “{c.title || 'Untitled'}”</span>
		<button class="snap" onclick={() => c.snapshotNow()}>Snapshot now</button>
	</div>
	<EntryList
		items={entries}
		empty="no revisions yet — snapshots are taken when you switch sheets"
		onpick={(id) => c.restoreRevision(Number(id))}
	/>
</FloatingPanel>

<style>
	.hist-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}
	.fmt-label {
		font-size: 0.85rem;
		color: var(--text-2);
		margin-right: 0.1rem;
	}
	.snap {
		background: var(--surface-2);
		border: 1px solid var(--border);
		color: var(--text-2);
		border-radius: 6px;
		padding: 0.2rem 0.5rem;
		cursor: pointer;
		font-size: 0.78rem;
	}
	.snap:hover {
		border-color: var(--color-brand);
	}
</style>
