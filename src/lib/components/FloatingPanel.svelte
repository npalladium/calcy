<script lang="ts">
// Presentation-only: the floating, scrollable overlay box used by the Sheets,
// History, and Templates panels. Owns only the box chrome; content is a slot.
import type { Snippet } from 'svelte';

let { label, children }: { label: string; children: Snippet } = $props();
</script>

<section class="float" aria-label={label}>
	{@render children()}
</section>

<style>
	.float {
		position: absolute;
		right: 0.75rem;
		top: 3.2rem;
		width: 340px;
		max-height: 70vh;
		overflow: auto;
		display: flex;
		flex-direction: column;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.6rem 0.9rem;
		z-index: 20;
		box-shadow: 0 12px 40px var(--shadow);
	}
</style>
