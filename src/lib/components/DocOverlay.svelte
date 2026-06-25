<script lang="ts">
// Presentation-only: a full-screen reader overlay for long-form docs (the Guide
// and "How it works"). Owns the chrome — dimmed backdrop, centered readable
// column, sticky title bar, close button. Content is a slot. Esc is handled by
// the app's global keymap (closeOverlays); clicking the backdrop also closes.
import type { Snippet } from 'svelte';

let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } =
	$props();
</script>

<div class="scrim">
	<button class="backdrop" aria-label="close" onclick={onclose}></button>
	<div class="doc" role="dialog" aria-modal="true" aria-label={title}>
		<header>
			<h2>{title}</h2>
			<button class="x" onclick={onclose} aria-label="close">✕</button>
		</header>
		<div class="content">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		justify-content: center;
		padding: clamp(0.5rem, 4vh, 3rem) 1rem;
		background: rgb(0 0 0 / 0.45);
	}
	.backdrop {
		position: absolute;
		inset: 0;
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		cursor: default;
	}
	.doc {
		position: relative;
		z-index: 1;
		width: min(720px, 100%);
		max-height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 16px 60px var(--shadow);
		overflow: hidden;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1.25rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface-1);
	}
	h2 {
		margin: 0;
		font-size: 1.05rem;
		color: var(--color-brand);
		letter-spacing: -0.01em;
	}
	.x {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
	}
	.x:hover {
		color: var(--text);
	}
	.content {
		overflow: auto;
		padding: 1.25rem 1.5rem 2rem;
		line-height: 1.6;
		color: var(--text-2);
	}
	/* Shared prose styling for the doc body (children). */
	.content :global(h3) {
		margin: 1.6rem 0 0.5rem;
		font-size: 0.95rem;
		color: var(--text);
		letter-spacing: 0.01em;
	}
	.content :global(h3:first-child) {
		margin-top: 0;
	}
	.content :global(p) {
		margin: 0.5rem 0;
	}
	.content :global(ul) {
		margin: 0.5rem 0;
		padding-left: 1.2rem;
	}
	.content :global(li) {
		margin: 0.25rem 0;
	}
	.content :global(code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 0.05rem 0.3rem;
		color: var(--c-value-soft);
	}
	.content :global(pre) {
		margin: 0.6rem 0;
		padding: 0.7rem 0.9rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow-x: auto;
	}
	.content :global(pre code) {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.82rem;
		color: var(--text-2);
		white-space: pre;
	}
	.content :global(.lead) {
		color: var(--text);
		font-size: 1rem;
	}
	.content :global(a) {
		color: var(--color-brand);
	}
	.content :global(strong) {
		color: var(--text);
	}
</style>
