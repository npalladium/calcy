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
// single result without first selecting the line in the inspector, plus an
// insert button that drops the line's value (or variable name, for an
// assignment) at the editor cursor.
import { astText, type LineResult } from '$lib/engine';
import Sparkline from './Sparkline.svelte';

let {
	lines,
	selected,
	onselect,
	oncopy,
	oninsert,
	showAst = false,
	blank = false
}: {
	lines: LineResult[];
	selected: number;
	onselect: (index: number) => void;
	oncopy?: (index: number) => void;
	// Receives the text to drop at the cursor: the variable name for a named
	// assignment, otherwise the line's formatted result.
	oninsert?: (text: string) => void;
	showAst?: boolean;
	// True when the whole sheet is empty: the Notepad's onboarding overlay
	// already explains how to start, so we skip the gutter's own hint rather
	// than echo it a second time alongside it.
	blank?: boolean;
} = $props();

// "Has anything to show" — a sheet that's empty or only comments/blank lines
// produces blank rows that render as a bare strip, so we show a hint instead.
const hasResult = $derived(
	lines.some((l) => !!l.error || l.kind === 'value' || l.kind === 'unitdef')
);
// Only sparkline a distribution that actually has spread. A degenerate one
// (e.g. x − x, where correlation-by-reuse cancels to an exact value) collapses
// to a single full-height bar that reads like a rendering glitch, not a shape.
const distHist = (l: LineResult) =>
	l.isDist && l.summary?.kind === 'dist' && l.summary.min !== l.summary.max
		? l.summary.hist
		: null;
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

// A named assignment inserts its name (so it can be referenced elsewhere);
// any other line with a value inserts the formatted result. Errors and
// comment/blank/unitdef rows have nothing insertable.
function insertValueFor(l: LineResult): string | null {
	if (l.name) return l.name;
	if (l.kind === 'value' && !l.error && l.display?.text) return l.display.text;
	return null;
}

function onInsertClick(e: MouseEvent, l: LineResult) {
	e.stopPropagation(); // don't also select the row
	const text = insertValueFor(l);
	if (!text || !oninsert) return;
	oninsert(text);
}

// Imperative ref so CodeEditor can sync the gutter's scrollTop from outside.
let scrollEl = $state<HTMLDivElement>();
export function setScrollTop(top: number) {
	if (scrollEl) scrollEl.scrollTop = top;
}
</script>

<div class="gutter" bind:this={scrollEl} aria-hidden={!hasResult}>
	{#if hasResult}
		{#each lines as l (l.index)}
		<div
			class="row"
			class:err={!!l.error}
			class:dist={l.isDist}
			class:rate={l.isRate && !l.isDist}
			class:blank={!l.error && l.kind !== 'value' && l.kind !== 'unitdef'}
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
				<!-- Results are clipped to keep each row aligned with its editor line
				     (no wrapping), so expose the full text on hover when it overflows. -->
				<span class="txt" title={l.kind === 'value' ? (l.display?.text ?? undefined) : undefined}>
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
			{#if oninsert && insertValueFor(l)}
				<button
					type="button"
					class="insert-btn"
					aria-label="insert into editor"
					title={l.name ? `insert ${l.name}` : 'insert result'}
					tabindex="-1"
					onclick={(e) => onInsertClick(e, l)}
				>⇤</button>
			{/if}
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
		{/each}
	{:else if !blank}
		<div class="empty">
			<p class="empty-title">Results appear here</p>
			<p class="empty-sub">Type math on the left—each line's answer lands on this row.</p>
		</div>
	{/if}
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
		/* Leave room for the absolutely-positioned insert + copy buttons on the right. */
		padding-right: 42px;
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
	.row.sel:not(.blank) {
		background: var(--surface-2);
	}
	.row:hover:not(.blank) {
		background: var(--surface-1);
	}
	.row:focus-visible:not(.blank) {
		outline: none;
		background: var(--surface-2);
	}
	/* Comment/blank lines have no result, so don't paint a selection box for an
	   otherwise-empty row (it reads as a stray grey rectangle). */
	.row.blank {
		cursor: default;
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
	/* The insert button sits just to the left of the copy button, same size
	   and hover-reveal behaviour. */
	.insert-btn {
		position: absolute;
		top: 50%;
		right: 22px;
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
	.row:hover .insert-btn,
	.insert-btn:focus-visible {
		opacity: 1;
	}
	.insert-btn:hover {
		color: var(--text);
		border-color: var(--color-brand);
	}
	.copy-btn.visible {
		color: var(--color-brand);
		border-color: var(--color-brand);
	}
	.empty {
		margin: auto;
		text-align: center;
		padding: 1rem;
		max-width: 22ch;
	}
	.empty-title {
		margin: 0 0 0.35rem;
		color: var(--text-muted);
		font-size: 0.92rem;
	}
	.empty-sub {
		margin: 0;
		color: var(--text-faint);
		font-size: 0.8rem;
		line-height: 1.45;
	}
</style>