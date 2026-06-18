<script lang="ts">
// Presentation-only: browse/search sheets. Maps controller state into EntryList
// rows and forwards row intents back to the controller.
import type { SheetController } from '$lib/state/sheet.svelte';
import EntryList, { type Entry } from './EntryList.svelte';
import FloatingPanel from './FloatingPanel.svelte';

let { c }: { c: SheetController } = $props();

const entries = $derived<Entry[]>(
	c.sheetsList.map((s) => ({
		id: s.id,
		title: s.title || 'Untitled',
		subtitle: s.snippet,
		at: s.updated_at,
		current: s.id === c.sheetId
	}))
);

function focusOnMount(node: HTMLInputElement) {
	node.focus();
}
</script>

<FloatingPanel label="sheets">
	<input
		class="search"
		placeholder="search all sheets… (⌘K)"
		use:focusOnMount
		bind:value={c.searchQuery}
		oninput={() => c.refreshSheets()}
	/>
	<EntryList items={entries} empty="no sheets" onpick={(id) => c.openSheet(id)}>
		{#snippet actions(it)}
			<button class="act" title="rename" aria-label="rename sheet" onclick={() => c.renameSheet(it.id)}>✎</button>
			<button class="act" title="duplicate" aria-label="duplicate sheet" onclick={() => c.duplicateSheet(it.id)}>⎘</button>
			<button class="del" title="delete sheet" aria-label="delete sheet" onclick={() => c.deleteSheet(it.id)}>✕</button>
		{/snippet}
	</EntryList>
</FloatingPanel>

<style>
	.search {
		width: 100%;
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text);
		border-radius: 6px;
		padding: 0.35rem 0.5rem;
		margin-bottom: 0.5rem;
	}
	.act,
	.del {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		padding: 0 0.45rem;
		border-radius: 6px;
		font-size: 0.85rem;
	}
	.act:hover {
		color: var(--accent-soft);
		background: var(--surface-3);
	}
	.del:hover {
		color: var(--c-error);
		background: var(--danger-bg);
	}
</style>
