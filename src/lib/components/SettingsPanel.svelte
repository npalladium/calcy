<script lang="ts">
// Presentation-only: the settings strip. Everyday controls (number format,
// confidence, sample count) sit up front; power knobs (calendar conventions,
// custom units, AST toggle, seed) fold into an "Advanced" disclosure, and the
// whole-database Export/Import + destructive actions live in stacked cards
// below — so a newcomer isn't shown all of it at once.
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

let jsonInput = $state<HTMLInputElement>();
let dbInput = $state<HTMLInputElement>();

// Hand a picked file to the controller, then clear the input so picking the
// same file again still fires a change event.
function pick(e: Event, handler: (f: File) => void) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (file) handler(file);
	input.value = '';
}
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

	<div class="sections">
		<!-- Whole-database backup/restore. Per-sheet outputs (copy/share, txt/md/csv)
		     stay in the toolbar's Copy menu; this is the all-of-it backup. -->
		<section class="card" aria-label="export and import">
			<p class="card-label">Export &amp; Import</p>
			<div class="rows">
				<div class="row">
					<div class="row-text">
						<p class="row-title">Export backup</p>
						<p class="row-desc">All sheets, custom units &amp; settings as a versioned <span class="mono">.json</span>.</p>
					</div>
					<button type="button" class="act" onclick={() => c.exportJson()}>Export JSON</button>
				</div>
				<div class="row">
					<div class="row-text">
						<p class="row-title">Import backup</p>
						<p class="row-desc">Merge from a calcy <span class="mono">.json</span> — existing data is kept.</p>
					</div>
					<button type="button" class="act" onclick={() => jsonInput?.click()}>Import JSON</button>
					<input bind:this={jsonInput} type="file" accept=".json,application/json" onchange={(e) => pick(e, (f) => c.importJson(f))} hidden />
				</div>
				<div class="row">
					<div class="row-text">
						<p class="row-title">Export database</p>
						<p class="row-desc">The full on-device database as a <span class="mono">.sqlite</span> file.</p>
					</div>
					<button type="button" class="act" onclick={() => c.exportDb()}>Export .sqlite</button>
				</div>
				<div class="row">
					<div class="row-text">
						<p class="row-title">Import database</p>
						<p class="row-desc">Replace <em>everything</em> with a <span class="mono">.sqlite</span> backup.</p>
					</div>
					<button type="button" class="act" onclick={() => dbInput?.click()}>Import .sqlite</button>
					<input bind:this={dbInput} type="file" accept=".sqlite" onchange={(e) => pick(e, (f) => c.importDb(f))} hidden />
				</div>
			</div>
			{#if c.dataMessage}
				<p class="data-msg" class:err={c.dataError} role="status">{c.dataMessage}</p>
			{/if}
		</section>

		<!-- Reversible-ish destructive actions. -->
		<section class="card danger" aria-label="danger zone">
			<p class="card-label danger-label">Danger zone</p>
			<div class="rows">
				<div class="row">
					<div class="row-text">
						<p class="row-title">Clear all sheets</p>
						<p class="row-desc">Delete every sheet and its history. Custom units &amp; settings are kept.</p>
					</div>
					<button type="button" class="act danger-btn" onclick={() => c.clearAllSheets()}>Clear</button>
				</div>
				<div class="row">
					<div class="row-text">
						<p class="row-title">Reset settings &amp; custom units</p>
						<p class="row-desc">Restore defaults and remove custom units. Your sheets are kept.</p>
					</div>
					<button type="button" class="act danger-btn" onclick={() => c.resetUserData()}>Reset</button>
				</div>
			</div>
		</section>

		<!-- The nuclear option, folded away behind its own banner. -->
		<details class="card danger dragons" aria-label="here be dragons">
			<summary class="card-label danger-label">🐉 Here be dragons</summary>
			<div class="rows">
				<div class="row">
					<div class="row-text">
						<p class="row-title">Wipe all on-device storage</p>
						<p class="row-desc">Erase the entire database — every sheet, revision, unit &amp; setting — and reset calcy to a clean slate. Cannot be undone.</p>
					</div>
					<button type="button" class="act danger-btn" onclick={() => c.wipeStorage()}>Wipe</button>
				</div>
			</div>
		</details>
	</div>
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
	/* Stacked cards (Export & Import / Danger zone / Here be dragons) take their
	   own full-width column below the inline controls. */
	.sections {
		flex-basis: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-top: 0.5rem;
		max-width: 640px;
	}
	.card {
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--surface-2);
		padding: 0.5rem 0.75rem;
	}
	.card.danger {
		border-color: var(--danger-border);
	}
	.card-label {
		margin: 0 0 0.2rem;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-muted);
	}
	.danger-label {
		color: var(--c-error);
	}
	.rows {
		display: flex;
		flex-direction: column;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.45rem 0;
	}
	.row + .row {
		border-top: 1px solid var(--border);
	}
	.row-text {
		min-width: 0;
	}
	.row-title {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text);
	}
	.row-desc {
		margin: 0.1rem 0 0;
		font-size: 0.75rem;
		color: var(--text-muted);
	}
	.mono {
		font-family: var(--font-mono);
	}
	.act {
		flex-shrink: 0;
		background: var(--surface-1);
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.3rem 0.6rem;
		border-radius: 7px;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.act:hover {
		border-color: var(--color-brand);
		color: var(--text);
	}
	.danger-btn {
		color: var(--c-error);
		border-color: var(--danger-border);
	}
	.danger-btn:hover {
		border-color: var(--c-error);
		background: var(--danger-bg);
		color: var(--c-error);
	}
	.data-msg {
		margin: 0.5rem 0 0;
		font-size: 0.78rem;
		color: var(--text-2);
	}
	.data-msg.err {
		color: var(--c-error);
	}
	.dragons > summary {
		cursor: pointer;
		list-style: none;
	}
	.dragons > summary::-webkit-details-marker {
		display: none;
	}
	.dragons[open] > summary {
		margin-bottom: 0.4rem;
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
