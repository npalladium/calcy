<script lang="ts">
// Notepad: the editable calculator surface. Wraps CodeMirror (in CodeEditor)
// with the empty-state placeholder and templates CTA. The result gutter
// was extracted into <Gutter /> so the page layout can put editor / gutter /
// inspector into three drag-resizable columns. Scroll-sync between editor
// and gutter is wired by the page.
import type { LineResult } from '$lib/engine';
import type { Template } from '$lib/templates';
import CodeEditor from './CodeEditor.svelte';

let {
	value = $bindable(),
	lines,
	selected,
	unitNames = [],
	templates = [],
	showAst = false,
	onselect,
	onloadtemplate,
	onscrolltop
}: {
	value: string;
	lines: LineResult[];
	selected: number;
	unitNames?: string[];
	templates?: Template[];
	showAst?: boolean;
	onselect: (index: number) => void;
	onloadtemplate?: (t: Template) => void;
	onscrolltop?: (top: number) => void;
} = $props();

let editor = $state<ReturnType<typeof CodeEditor>>();

// Drop a cheat-sheet snippet at the caret — delegated to the editor.
export function insertSnippet(snippet: string) {
	editor?.insertSnippet(snippet);
}

const isEmpty = $derived(value.trim() === '');
</script>

<div class="pad">
	<div class="ed-wrap">
		<CodeEditor
			bind:this={editor}
			bind:value
			{lines}
			{unitNames}
			oncaretline={(i) => onselect(i)}
			{onscrolltop}
		/>
		{#if isEmpty}
			<div class="empty">
				<p class="big">Type math. Get answers.</p>
				{#if templates.length}
					<p class="sub">…or start from a template:</p>
					<div class="tpl-grid">
						{#each templates as t (t.title)}
							<button type="button" class="tpl" onclick={() => onloadtemplate?.(t)}>
								<span class="tpl-title">{t.title}</span>
								<span class="tpl-blurb">{t.blurb}</span>
							</button>
						{/each}
					</div>
				{/if}
				<p class="cta">Open <kbd>?</kbd> for the cheat sheet.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.pad {
		height: 100%;
		min-height: 320px;
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
		background: var(--surface-1);
		display: flex;
	}
	.ed-wrap {
		flex: 1;
		position: relative;
		min-width: 0;
		display: flex;
	}
	.ed-wrap > :global(.cm-host) {
		flex: 1;
	}
	.empty {
		position: absolute;
		inset: 10px 12px 10px 40px;
		pointer-events: none;
		color: var(--text-faint);
	}
	.empty .big {
		margin: 0 0 0.6rem;
		color: var(--text-muted);
		font-size: 1.05rem;
		font-family:
			system-ui,
			sans-serif;
	}
	.empty .sub {
		margin: 0 0 0.6rem;
		font-family:
			system-ui,
			sans-serif;
		font-size: 0.85rem;
		color: var(--text-faint);
	}
	.tpl-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
		max-width: 560px;
	}
	.tpl {
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-align: left;
		background: var(--surface-1);
		border: 1px solid var(--surface-3);
		border-radius: 8px;
		padding: 0.5rem 0.7rem;
		cursor: pointer;
		min-width: 160px;
		flex: 1 1 160px;
	}
	.tpl:hover {
		border-color: var(--color-brand);
		background: var(--surface-1);
	}
	.tpl-title {
		font-family:
			system-ui,
			sans-serif;
		font-size: 0.85rem;
		color: var(--text-2);
		font-weight: 600;
	}
	.tpl-blurb {
		font-family:
			system-ui,
			sans-serif;
		font-size: 0.74rem;
		color: var(--text-faint);
	}
	.empty .cta {
		margin: 0;
		font-family:
			system-ui,
			sans-serif;
		font-size: 0.85rem;
	}
	.empty kbd {
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		padding: 0 0.3rem;
		font-family: var(--font-mono);
		color: var(--text-2);
	}
</style>