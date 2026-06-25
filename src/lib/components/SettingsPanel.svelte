<script lang="ts">
// Presentation-only: the settings strip (calendar conventions, sample count,
// number format, export/import, custom units, AST toggle).
import type { NumberFormat } from '$lib/engine';
import type { SheetController } from '$lib/state/sheet.svelte';

let { c }: { c: SheetController } = $props();

const NUMBER_FORMATS: { value: NumberFormat; label: string; hint: string }[] = [
	{ value: 'auto', label: 'Auto', hint: '1.04B — picks per value' },
	{ value: 'compact', label: '1M / 1B', hint: 'short-scale suffixes' },
	{ value: 'newspaper', label: '1 million', hint: 'spelled-out scale words' },
	{ value: 'scientific', label: '1e9', hint: 'scientific notation' }
];

let importInput = $state<HTMLInputElement>();

// The calendar conventions are precise fractions (a Gregorian month is
// 365.2425/12 = 30.436875 days), which read as noise in the input. Trim the
// *display* to a few decimals; the stored value keeps full precision until the
// user actually edits it.
const trim = (n: number) => +n.toFixed(4);

function onImport(e: Event) {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (file) c.importDb(file);
}
</script>

<section class="panel settings" aria-label="settings">
	<label>month = <input type="number" step="any" value={trim(c.monthDays)} onchange={(e) => { c.monthDays = +e.currentTarget.value; c.persistSetting('monthDays', String(c.monthDays)); }} /> day</label>
	<label>year = <input type="number" step="any" value={trim(c.yearDays)} onchange={(e) => { c.yearDays = +e.currentTarget.value; c.persistSetting('yearDays', String(c.yearDays)); }} /> day</label>
	<label>samples N = <input type="number" step="1000" bind:value={c.samples} onchange={() => c.persistSetting('samples', String(c.samples))} /></label>
	<div class="fmt" role="group" aria-label="number format">
		<span class="fmt-label">numbers</span>
		{#each NUMBER_FORMATS as f (f.value)}
			<button type="button" class:active={c.numberFormat === f.value} title={f.hint} onclick={() => c.setNumberFormat(f.value)}>{f.label}</button>
		{/each}
	</div>
	<div class="ci" role="group" aria-label="confidence level">
		<span class="fmt-label">CI</span>
		{#each [0.68, 0.9, 0.95, 0.99] as lv (lv)}
			<button type="button" class:active={Math.abs(c.confidence - lv) < 1e-9} title={`'a to b' means ${(lv * 100).toFixed(0)}% CI`} onclick={() => c.setConfidence(lv)}>{(lv * 100).toFixed(0)}%</button>
		{/each}
	</div>
	<div class="data-actions" role="group" aria-label="export and import">
		<span class="fmt-label">export</span>
		<button type="button" onclick={() => c.exportTxt()}>.txt</button>
		<button type="button" onclick={() => c.exportMd()}>.md</button>
		<button type="button" onclick={() => c.exportCsv()}>.csv</button>
		<button type="button" onclick={() => c.exportDb()}>.sqlite</button>
		<button type="button" onclick={() => importInput?.click()}>Import .sqlite</button>
		<input bind:this={importInput} type="file" accept=".sqlite" onchange={onImport} hidden />
	</div>
	<div class="units" role="group" aria-label="custom units">
		<span class="fmt-label">custom units</span>
		{#each Object.entries(c.customUnits) as [name, def] (name)}
			<span class="chip" title={def}>{name}<button type="button" aria-label="remove {name}" onclick={() => c.removeCustomUnit(name)}>✕</button></span>
		{/each}
		<input
			class="unit-input"
			placeholder="sprint = 2 week"
			bind:value={c.newUnit}
			onkeydown={(e) => { if (e.key === 'Enter') c.applyCustomUnit(); }}
		/>
		<button type="button" onclick={() => c.applyCustomUnit()}>Add</button>
		{#if c.unitError}<span class="unit-err">{c.unitError}</span>{/if}
	</div>
	<label class="debug-toggle">
		<input type="checkbox" checked={c.debugAst} onchange={() => c.toggleDebug()} />
		show parsed AST in result gutter <span class="kbd-inline">⌘D</span>
	</label>
	<span class="muted">seed {c.seedHex} · CI = {(c.confidence * 100).toFixed(0)}% · all compute is local</span>
</section>

<style>
	.panel {
		border-bottom: 1px solid var(--border);
		background: var(--surface-1);
		padding: 0.6rem 0.9rem;
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}
	.settings label {
		font-size: 0.85rem;
		color: var(--text-2);
	}
	.settings input[type='number'] {
		width: 7rem;
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text);
		border-radius: 6px;
		padding: 0.2rem 0.4rem;
	}
	.fmt,
	.ci,
	.data-actions {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.fmt-label {
		font-size: 0.85rem;
		color: var(--text-2);
		margin-right: 0.1rem;
	}
	.fmt button,
	.ci button,
	.data-actions button {
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
		font-family: var(--font-mono);
	}
	.fmt button:hover,
	.ci button:hover,
	.data-actions button:hover {
		border-color: var(--color-brand);
	}
	.fmt button.active,
	.ci button.active {
		background: var(--color-brand);
		color: var(--text);
		border-color: var(--color-brand);
	}
	.muted {
		color: var(--text-muted);
		font-size: 0.8rem;
	}
	.debug-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--text-2);
	}
	.debug-toggle input[type='checkbox'] {
		accent-color: var(--color-brand);
	}
	.kbd-inline {
		display: inline-block;
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		padding: 0 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--text-2);
		margin-left: 0.3rem;
	}
	.units {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
	}
	.unit-input {
		width: 11rem;
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text);
		border-radius: 6px;
		padding: 0.2rem 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}
	.units button {
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--surface-accent);
		border: 1px solid var(--border-accent);
		color: var(--accent-soft);
		border-radius: 999px;
		padding: 0.1rem 0.2rem 0.1rem 0.55rem;
		font-family: var(--font-mono);
		font-size: 0.78rem;
	}
	.chip button {
		border: none;
		background: none;
		color: var(--text-faint);
		cursor: pointer;
		padding: 0 0.25rem;
		font-size: 0.7rem;
	}
	.chip button:hover {
		color: var(--c-error);
	}
	.unit-err {
		color: var(--c-error);
		font-size: 0.78rem;
	}
</style>
