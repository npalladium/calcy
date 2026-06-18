<script lang="ts">
// Presentation-only: start a new sheet from a built-in template.
import type { SheetController } from '$lib/state/sheet.svelte';
import { TEMPLATES } from '$lib/templates';
import EntryList, { type Entry } from './EntryList.svelte';
import FloatingPanel from './FloatingPanel.svelte';

let { c }: { c: SheetController } = $props();

const entries: Entry[] = TEMPLATES.map((t) => ({ id: t.title, title: t.title, subtitle: t.blurb }));
const byTitle = new Map(TEMPLATES.map((t) => [t.title, t]));
</script>

<FloatingPanel label="templates">
	<div class="hist-head">
		<span class="fmt-label">start from a template</span>
	</div>
	<EntryList
		items={entries}
		onpick={(id) => {
			const t = byTitle.get(id);
			if (t) c.newFromTemplate(t);
		}}
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
</style>
