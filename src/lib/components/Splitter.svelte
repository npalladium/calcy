<script lang="ts">
// Vertical column splitter: drag horizontally to resize, or click a chevron
// to fully collapse/expand the adjacent column. Uses pointer events so the
// same drag handler covers mouse and touch.
//
// `min` is the px floor for the column on the LEFT side of the splitter when
// expanded. `leftCollapsed` and `rightCollapsed` are read-only reflections
// of the parent's collapse state for the two adjacent columns; the parent
// owns the truth and toggles via the chevron callbacks.
//
// Two chevrons are always present (one per adjacent column) but only render
// on hover/focus/collapse to avoid cluttering the resting state. The left
// chevron points left (toward the left column) and collapses it; the right
// chevron points right and collapses the right column.
let {
	min = 200,
	leftCollapsed = false,
	rightCollapsed = false,
	collapsible = true,
	onresize,
	onlefttoggle,
	onrighttoggle
}: {
	min?: number;
	leftCollapsed?: boolean;
	rightCollapsed?: boolean;
	collapsible?: boolean;
	onresize: (deltaPx: number) => void;
	onlefttoggle?: () => void;
	onrighttoggle?: () => void;
} = $props();

let dragging = $state(false);
let lastX = 0;

function onPointerDown(e: PointerEvent) {
	dragging = true;
	lastX = e.clientX;
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	e.preventDefault();
}
function onPointerMove(e: PointerEvent) {
	if (!dragging) return;
	const dx = e.clientX - lastX;
	lastX = e.clientX;
	onresize(dx);
}
function onPointerUp(e: PointerEvent) {
	if (!dragging) return;
	dragging = false;
	(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
}
function onKey(e: KeyboardEvent) {
	const step = e.shiftKey ? 32 : 8;
	if (e.key === 'ArrowLeft') {
		e.preventDefault();
		onresize(-step);
	} else if (e.key === 'ArrowRight') {
		e.preventDefault();
		onresize(step);
	}
}
function chevronClick(e: MouseEvent, fn?: () => void) {
	e.stopPropagation(); // don't also start a drag
	if (fn) fn();
}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="splitter"
	class:active={dragging}
	class:any-collapsed={leftCollapsed || rightCollapsed}
	role="separator"
	aria-orientation="vertical"
	tabindex="0"
	aria-label="resize column"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onkeydown={onKey}
>
	{#if collapsible && onlefttoggle}
		<button
			type="button"
			class="chevron left"
			class:visible={leftCollapsed}
			aria-label={leftCollapsed ? 'expand left column' : 'collapse left column'}
			tabindex="-1"
			onclick={(e) => chevronClick(e, onlefttoggle)}
		>‹</button>
	{/if}
	{#if collapsible && onrighttoggle}
		<button
			type="button"
			class="chevron right"
			class:visible={rightCollapsed}
			aria-label={rightCollapsed ? 'expand right column' : 'collapse right column'}
			tabindex="-1"
			onclick={(e) => chevronClick(e, onrighttoggle)}
		>›</button>
	{/if}
</div>

<style>
	.splitter {
		cursor: col-resize;
		background: transparent;
		position: relative;
		touch-action: none;
		/* Wider hit target than visual line; the centre 1px gets the
		   visible border, the rest is invisible padding for the cursor. */
		width: 6px;
		flex-shrink: 0;
	}
	.splitter::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 1px;
		background: var(--border);
		transition: background 0.15s;
	}
	.splitter:hover::before,
	.splitter.active::before {
		background: var(--color-brand);
	}
	.splitter:focus-visible {
		outline: none;
	}
	.splitter:focus-visible::before {
		background: var(--color-brand);
		box-shadow: 0 0 0 2px var(--color-brand);
	}
	/* Two chevrons pinned to the middle of the splitter, one per side. They
	   fade in on hover/focus or stay visible when their adjacent column is
	   collapsed (so the user can re-expand). */
	.chevron {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 14px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		background: var(--surface-1);
		color: var(--text-muted);
		font-size: 12px;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}
	.chevron.left {
		left: 0;
		transform: translate(-50%, -50%);
	}
	.chevron.right {
		right: 0;
		transform: translate(50%, -50%);
	}
	.splitter:hover .chevron,
	.splitter:focus-within .chevron,
	.chevron.visible {
		opacity: 1;
	}
	.chevron:hover {
		color: var(--text);
		border-color: var(--color-brand);
	}
</style>