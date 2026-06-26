<script lang="ts">
// Presentation-only: the floating, scrollable overlay box used by the Sheets,
// History, and Templates panels. Owns only the box chrome; content is a slot.
import type { Snippet } from 'svelte';

// `width` lets a heavier panel (settings) claim a little more room than the
// list panels' default; everything else still scrolls within max-height.
let { label, width = '340px', children }: { label: string; width?: string; children: Snippet } = $props();
</script>

<section class="float" aria-label={label} style="width: {width};">
	{@render children()}
</section>

<style>
	.float {
		position: absolute;
		right: 0.75rem;
		top: 3.2rem;
		/* `width` comes from the prop (inline style); cap it so a wide panel
		   still fits a narrow viewport. */
		max-width: calc(100vw - 1.5rem);
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
