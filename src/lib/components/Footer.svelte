<script lang="ts">
// Presentation-only: a slim footer bar with links to the long-form docs and the
// privacy note. Intents forward to the controller.
import type { SheetController } from '$lib/state/sheet.svelte';

let { c }: { c: SheetController } = $props();
</script>

<footer>
	<nav aria-label="documentation">
		<button class="link" onclick={() => c.openGuide()}>Guide</button>
		<span class="dot" aria-hidden="true">·</span>
		<button class="link" onclick={() => c.openHowItWorks()}>How it works</button>
	</nav>
	<span class="note">Runs locally — no network, no account.</span>
</footer>

<style>
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.3rem 0.9rem;
		border-top: 1px solid var(--border);
		background: var(--surface-1);
		font-size: 0.76rem;
		color: var(--text-muted);
		flex-wrap: wrap;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--text-2);
		font-size: inherit;
	}
	.link:hover {
		color: var(--color-brand);
		text-decoration: underline;
	}
	.dot {
		color: var(--text-faint);
	}
	.note {
		color: var(--text-faint);
	}
</style>
