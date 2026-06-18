<script lang="ts">
// The result gutter: one row per line in the sheet, paired-line to the
// editor so the user can scan results without taking their hands off the
// keyboard. Sparklines for distribution-valued lines, plain text for points
// and rates, error message on errors.
//
// Extracted from Notepad so the three-pane layout (editor | gutter | inspector)
// is drag-resizable; the gutter now lives next to the inspector and scrolls
// in lockstep with the editor via `scrollTop` writes from CodeEditor.
//
// Each row also has a hover-revealed copy button so the user can grab a
// single result without first selecting the line in the inspector.
import { astText, type LineResult } from '$lib/engine';
import Sparkline from './Sparkline.svelte';

let {
	lines,
	selected,
	onselect,
	oncopy,
	showAst = false
}: {
	lines: LineResult[];
	selected: number;
	onselect: (index: number) => void;
	oncopy?: (index: number) => void;
	showAst?: boolean;
} = $props();

const isEmpty = $derived(lines.length === 0);
const distHist = (l: LineResult) =>
	l.isDist && l.summary?.kind === 'dist' ? l.summary.hist : null;
const lineAst = (l: LineResult) => (showAst && l.ast ? astText(l.ast) : '');

// Track which row was just copied (for the brief "✓" feedback). Cleared
// after a short delay so the indicator disappears even on rapid clicks.
let justCopied = $state<number | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

function onCopyClick(e: MouseEvent, index: number) {
	e.stopPropagation(); // don't also select the row
	if (!oncopy) return;
	oncopy(index);
	justCopied = index;
	if (copyTimer) clearTimeout(copyTimer);
	copyTimer = setTimeout(() => (justCopied = null), 1200);
}

// Imperative ref so CodeEditor can sync the gutter's scrollTop from outside.
let scrollEl = $state<HTMLDivElement>();
export function setScrollTop(top: number) {
	if (scrollEl) scrollEl.scrollTop = top;
}
</script>

<div class="gutter" bind:this={scrollEl} aria-hidden={isEmpty}>
	{#each lines as l (l.index)}
		<div
			class="row"
			class:err={!!l.error}
			class:dist={l.isDist}
			class:rate={l.isRate && !l.isDist}
			class:sel={l.index === selected}
			role="button"
			tabindex="0"
			onclick={() => onselect(l.index)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onselect(l.index);
				}
			}}
			title={l.error && l.errorHint ? l.error : (lineAst(l) || undefined)}
		>
			<span class="line">
				{#if distHist(l)}
					<span class="spark"><Sparkline hist={distHist(l) ?? []} width={36} height={16} /></span>
				{/if}
				<span class="txt">
					{#if l.error}
						⚠ {l.errorHint ?? l.error}
					{:else if l.kind === 'value'}
						{l.display?.text ?? ''}
					{:else if l.kind === 'unitdef'}
						unit {l.name}
					{:else}
						&nbsp;
					{/if}
				</span>
			</span>
			{#if oncopy}
				<button
					type="button"
					class="copy-btn"
					class:visible={l.index === justCopied}
					aria-label="copy line result"
					tabindex="-1"
					onclick={(e) => onCopyClick(e, l.index)}
				>{l.index === justCopied ? '✓' : '⧉'}</button>
			{/if}
			{#if lineAst(l)}
				<span class="ast" aria-label="parsed AST">{lineAst(l)}</span>
			{/if}
		</div>
	{:else}
		<div class="empty">no lines yet</div>
	{/each}
</div>

<style>
	.gutter {
		height: 100%;
		min-height: 0;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--surface-1);
		overflow: auto;
		display: flex;
		flex-direction: column;
		font-family: var(--font-mono);
		font-size: 14px;
		line-height: 22px;
		padding: 10px 12px;
		box-sizing: border-box;
	}
	.row {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: center;
		gap: 1px;
		min-height: 22px;
		line-height: 22px;
		text-align: left;
		background: none;
		border: none;
		color: var(--c-value);
		font: inherit;
		padding: 0 4px;
		cursor: pointer;
		border-radius: 4px;
	}
	.row .line {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 22px;
		/* Leave room for the absolutely-positioned copy button on the right. */
		padding-right: 22px;
	}
	.row .txt {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.row .ast {
		display: block;
		font-size: 0.72rem;
		line-height: 1.3;
		color: var(--text-faint);
		padding: 0 2px 2px 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.row.err .ast,
	.row.dist .ast,
	.row.rate .ast {
		opacity: 0.85;
	}
	.spark {
		display: inline-flex;
		flex-shrink: 0;
		opacity: 0.85;
	}
	.row.err {
		color: var(--c-error);
	}
	.row.dist {
		color: var(--c-dist);
	}
	.row.rate {
		color: var(--c-rate);
	}
	.row.sel {
		background: var(--surface-2);
	}
	.row:hover {
		background: var(--surface-1);
	}
	.row:focus-visible {
		outline: none;
		background: var(--surface-2);
	}
	/* The copy button sits over the right edge of the row text. It's invisible
	   at rest and fades in on row hover; on touch (or when `always` is set) it
	   stays visible. While `visible` (just-copied) it shows the ✓ tick at full
	   opacity regardless of hover. */
	.copy-btn {
		position: absolute;
		top: 50%;
		right: 2px;
		transform: translateY(-50%);
		width: 18px;
		height: 18px;
		padding: 0;
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		background: var(--surface-1);
		color: var(--text-muted);
		font-size: 11px;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.12s;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}
	.row:hover .copy-btn,
	.copy-btn:focus-visible,
	.copy-btn.visible {
		opacity: 1;
	}
	.copy-btn:hover {
		color: var(--text);
		border-color: var(--color-brand);
	}
	.copy-btn.visible {
		color: var(--color-brand);
		border-color: var(--color-brand);
	}
	.empty {
		color: var(--text-faint);
		text-align: center;
		padding: 1rem;
	}
</style>