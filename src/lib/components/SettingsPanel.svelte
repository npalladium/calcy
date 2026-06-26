<script lang="ts">
// Presentation-only: the settings strip. Everyday controls (number format,
// confidence, sample count) sit up front; power knobs (calendar conventions,
// custom units, AST toggle, seed) fold into an "Advanced" disclosure so a
// newcomer isn't shown all of it at once.
import type { NumberFormat } from '$lib/engine';
import type { SheetController } from '$lib/state/sheet.svelte';
import ConfidenceExplainer from './ConfidenceExplainer.svelte';

let { c }: { c: SheetController } = $props();

const NUMBER_FORMATS: { value: NumberFormat; label: string; hint: string }[] = [
	{ value: 'auto', label: 'Auto', hint: '1.04B — picks per value' },
	{ value: 'compact', label: '1M / 1B', hint: 'short-scale suffixes' },
	{ value: 'newspaper', label: '1 million', hint: 'spelled-out scale words' },
	{ value: 'scientific', label: '1e9', hint: 'scientific notation' }
];

// The calendar conventions are precise fractions (a Gregorian month is
// 365.2425/12 = 30.436875 days), which read as noise in the input. Trim the
// *display* to a few decimals; the stored value keeps full precision until the
// user actually edits it.
const trim = (n: number) => +n.toFixed(4);
</script>

<section class="panel settings" aria-label="settings">
	<!-- Everyday controls a casual user reaches for: how numbers read, the
	     confidence band, and the Monte-Carlo sample count. -->
	<div class="grp" role="group" aria-label="number format">
		<span class="grp-label">numbers</span>
		{#each NUMBER_FORMATS as f (f.value)}
			<button type="button" class:active={c.numberFormat === f.value} title={f.hint} onclick={() => c.setNumberFormat(f.value)}>{f.label}</button>
		{/each}
	</div>

	<span class="divider" aria-hidden="true"></span>

	<ConfidenceExplainer level={c.confidence} onCommit={(lv) => c.setConfidence(lv)} />

	<span class="divider" aria-hidden="true"></span>

	<div class="grp" role="group" aria-label="sampling">
		<span class="grp-label">sampling</span>
		<label>N <input type="number" step="1000" bind:value={c.samples} onchange={() => c.persistSetting('samples', String(c.samples))} /></label>
	</div>

	<span class="muted">all compute is local</span>

	<!-- Power knobs folded away so a newcomer isn't shown calendar fractions,
	     custom units, and an AST toggle next to the basics. -->
	<details class="advanced">
		<summary>Advanced</summary>
		<div class="adv-row">
			<div class="grp">
				<span class="grp-label">calendar</span>
				<label>month <input type="number" step="any" value={trim(c.monthDays)} onchange={(e) => { c.monthDays = +e.currentTarget.value; c.persistSetting('monthDays', String(c.monthDays)); }} /> d</label>
				<label>year <input type="number" step="any" value={trim(c.yearDays)} onchange={(e) => { c.yearDays = +e.currentTarget.value; c.persistSetting('yearDays', String(c.yearDays)); }} /> d</label>
			</div>

			<span class="divider" aria-hidden="true"></span>

			<div class="grp units" role="group" aria-label="custom units">
				<span class="grp-label">units</span>
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

			<span class="divider" aria-hidden="true"></span>

			<div class="grp">
				<span class="grp-label">view</span>
				<label class="debug-toggle">
					<input type="checkbox" checked={c.debugAst} onchange={() => c.toggleDebug()} />
					parsed AST in gutter <span class="kbd-inline">⌘D</span>
				</label>
			</div>

			<span class="muted">seed {c.seedHex}</span>
		</div>
	</details>
</section>

<style>
	.panel {
		border-bottom: 1px solid var(--border);
		background: var(--surface-1);
		padding: 0.6rem 0.9rem;
		display: flex;
		gap: 0.65rem;
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
	/* Each setting cluster is a labelled group; thin dividers separate them so
	   the strip scans as sections rather than one long flat row. */
	.grp {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
	}
	.grp-label {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-muted);
		margin-right: 0.15rem;
	}
	.divider {
		align-self: stretch;
		width: 1px;
		min-height: 1.3rem;
		background: var(--border);
	}
	.grp > button {
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
		font-family: var(--font-mono);
	}
	.grp > button:hover {
		border-color: var(--color-brand);
	}
	.grp > button.active {
		background: var(--color-brand);
		color: var(--text);
		border-color: var(--color-brand);
	}
	.muted {
		color: var(--text-muted);
		font-size: 0.8rem;
	}
	/* The Advanced disclosure spans its own line within the wrapping strip, so
	   opening it reveals the power knobs in a row beneath the basics. */
	.advanced {
		flex-basis: 100%;
	}
	.advanced > summary {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		width: max-content;
		cursor: pointer;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-muted);
		padding: 0.15rem 0;
	}
	.advanced > summary:hover {
		color: var(--text-2);
	}
	.adv-row {
		display: flex;
		gap: 0.65rem;
		flex-wrap: wrap;
		align-items: center;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
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
