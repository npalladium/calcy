<script lang="ts">
// Cheat-sheet of the expression language (US-1). Each example is click-to-insert
// so users learn the syntax by dropping working lines into their sheet. The
// examples live in $lib/cheatsheet so a doctest can prove they all evaluate.
import { CHEAT_SHEET } from '$lib/cheatsheet';
let {
	oninsert,
	onguide,
	onhowitworks,
	onclose
}: {
	oninsert: (snippet: string) => void;
	onguide: () => void;
	onhowitworks: () => void;
	onclose: () => void;
} = $props();

const GROUPS = CHEAT_SHEET;
</script>

<aside class="help" aria-label="syntax cheat sheet">
	<header>
		<h3>Cheat sheet</h3>
		<button class="x" onclick={onclose} aria-label="close help">✕</button>
	</header>
	<p class="hint">Click any example to drop it into your sheet.</p>
	<div class="groups">
		{#each GROUPS as g (g.title)}
			<section>
				<h4>{g.title}</h4>
				{#each g.items as it (it.code)}
					<button class="ex" onclick={() => oninsert(it.code)} title="insert">
						<code>{it.code}</code>
						<span class="note">{it.note}</span>
					</button>
				{/each}
			</section>
		{/each}
	</div>
	<section class="shortcuts">
		<h4>Shortcuts</h4>
		<div class="keys">
			<span><kbd>⌘</kbd><kbd>K</kbd> sheets</span>
			<span><kbd>⌘</kbd><kbd>/</kbd> this help</span>
			<span><kbd>⌘</kbd><kbd>D</kbd> show AST</span>
			<span><kbd>⌘</kbd><kbd>↵</kbd> re-roll</span>
			<span><kbd>Esc</kbd> close</span>
		</div>
	</section>
	<p class="foot">
		A range shows the most likely value and the <em>likely range</em> (5th–95th percentile, i.e. 90%
		confidence). All computation is local — no network.
	</p>
	<nav class="docs" aria-label="documentation">
		<button class="doclink" onclick={onguide}>Read the Guide</button>
		<span aria-hidden="true">·</span>
		<button class="doclink" onclick={onhowitworks}>How it works</button>
	</nav>
</aside>

<style>
	.help {
		position: absolute;
		right: 0.75rem;
		top: 3.2rem;
		width: 380px;
		max-height: 78vh;
		overflow: auto;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.75rem 0.9rem;
		z-index: 30;
		box-shadow: 0 12px 40px var(--shadow);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h3 {
		margin: 0;
		color: var(--accent-soft);
		font-size: 0.95rem;
	}
	.x {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.9rem;
	}
	.x:hover {
		color: var(--text);
	}
	.hint {
		margin: 0.3rem 0 0.6rem;
		color: var(--text-muted);
		font-size: 0.78rem;
	}
	.groups {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	h4 {
		margin: 0 0 0.35rem;
		color: var(--c-rate);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}
	.ex {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem;
		width: 100%;
		text-align: left;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 7px;
		padding: 0.35rem 0.5rem;
		margin-bottom: 0.3rem;
		cursor: pointer;
	}
	.ex:hover {
		border-color: var(--color-brand);
		background: var(--surface-1);
	}
	.ex code {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--c-value-soft);
		white-space: pre;
	}
	.note {
		color: var(--text-muted);
		font-size: 0.7rem;
		flex-shrink: 0;
	}
	.shortcuts {
		margin-top: 0.85rem;
		border-top: 1px solid var(--border);
		padding-top: 0.6rem;
	}
	.keys {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.9rem;
		color: var(--text-muted);
		font-size: 0.74rem;
	}
	.keys kbd {
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		padding: 0 0.3rem;
		margin-right: 0.1rem;
		font-family: var(--font-mono);
		color: var(--text-2);
	}
	.foot {
		margin: 0.8rem 0 0;
		color: var(--text-faint);
		font-size: 0.72rem;
	}
	.docs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.6rem;
		color: var(--text-faint);
		font-size: 0.74rem;
	}
	.doclink {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--accent-soft);
		font-size: inherit;
	}
	.doclink:hover {
		color: var(--color-brand);
		text-decoration: underline;
	}
</style>
