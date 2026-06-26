<script lang="ts">
// Interactive explainer for the sheet's confidence level. Dragging the slider
// live-shades the central band of an illustrative lognormal (the family calcy
// fits from `a to b`) so you can *see* how 80% vs 99% widens the interval, and
// it doubles as the control: releasing commits the level to the sheet.
//
// The visual is computed client-side from the lognormal quantile (no engine
// round-trip), so dragging is smooth; only `onCommit` (on release / preset)
// re-evaluates the sheet.
import { zForLevel } from '$lib/engine/mc';

let { level, onCommit }: { level: number; onCommit: (level: number) => void } = $props();

// While dragging, `dragging` holds the in-flight value and drives the visual;
// when null the explainer follows the committed `level` (presets, other
// controls). This avoids seeding $state from a prop.
let dragging = $state<number | null>(null);
const preview = $derived(dragging ?? level);

const W = 232;
const H = 48;
// A gentle right-skewed lognormal, median 1 — just enough shape to read as "a
// distribution" rather than a bell.
const MU = 0;
const SIGMA = 0.42;
const pdf = (x: number) =>
	x <= 0 ? 0 : Math.exp(-((Math.log(x) - MU) ** 2) / (2 * SIGMA * SIGMA)) / (x * SIGMA * Math.sqrt(2 * Math.PI));

const view = $derived.by(() => {
	const z = zForLevel(preview); // symmetric half-width: Φ⁻¹((1+level)/2)
	const lo = Math.exp(MU - SIGMA * z);
	const hi = Math.exp(MU + SIGMA * z);
	const xmin = Math.exp(MU - 3 * SIGMA);
	const xmax = Math.exp(MU + 3.4 * SIGMA);
	const N = 72;
	const xs = Array.from({ length: N + 1 }, (_, i) => xmin + (i / N) * (xmax - xmin));
	const ys = xs.map(pdf);
	const maxY = Math.max(...ys);
	const px = (x: number) => ((x - xmin) / (xmax - xmin)) * W;
	const py = (y: number) => H - 2 - (y / maxY) * (H - 6);
	const areaPath = (a: number, b: number) => {
		const inner = xs.filter((x) => x > a && x < b);
		const seq = [a, ...inner, b];
		let d = `M ${px(seq[0]).toFixed(1)} ${H}`;
		for (const x of seq) d += ` L ${px(x).toFixed(1)} ${py(pdf(x)).toFixed(1)}`;
		return `${d} L ${px(b).toFixed(1)} ${H} Z`;
	};
	const curve = xs.map((x, i) => `${i ? 'L' : 'M'} ${px(x).toFixed(1)} ${py(ys[i]).toFixed(1)}`).join(' ');
	return { full: areaPath(xmin, xmax), band: areaPath(lo, hi), curve, medianX: px(1) };
});

function freq(l: number): string {
	const n10 = l * 10;
	if (Math.abs(n10 - Math.round(n10)) < 1e-9) return `${Math.round(n10)} in 10`;
	return `${Math.round(l * 100)} in 100`;
}
const pct = $derived(Math.round(preview * 100));
const PRESETS = [0.9, 0.95, 0.99];
</script>

<div class="explainer">
	<div class="head">
		<span class="grp-label">confidence</span>
		<output class="readout">{pct}%</output>
		{#each PRESETS as p (p)}
			<button type="button" class:active={Math.abs(level - p) < 1e-9} onclick={() => onCommit(p)}>
				{Math.round(p * 100)}
			</button>
		{/each}
	</div>

	<svg viewBox="0 0 {W} {H}" width={W} height={H} role="img" aria-label="confidence band on a sample distribution">
		<path class="full" d={view.full} />
		<path class="band" d={view.band} />
		<path class="curve" d={view.curve} />
		<line class="median" x1={view.medianX} x2={view.medianX} y1="4" y2={H} />
	</svg>

	<input
		type="range"
		min="0.5"
		max="0.99"
		step="0.01"
		value={preview}
		oninput={(e) => (dragging = +e.currentTarget.value)}
		onchange={(e) => {
			onCommit(+e.currentTarget.value);
			dragging = null;
		}}
		aria-label="confidence level"
	/>

	<p class="cap">
		<code>a to b</code> means the value lands in the shaded band about
		<strong>{freq(preview)}</strong> times.
	</p>
</div>

<style>
	.explainer {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		width: 232px;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.grp-label {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-muted);
	}
	.readout {
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--text);
		margin-right: auto;
	}
	.head button {
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.05rem 0.35rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.72rem;
		font-family: var(--font-mono);
	}
	.head button:hover {
		border-color: var(--color-brand);
	}
	.head button.active {
		background: var(--color-brand);
		color: var(--text);
		border-color: var(--color-brand);
	}
	svg {
		display: block;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 6px;
	}
	.full {
		fill: var(--color-brand);
		opacity: 0.14;
	}
	.band {
		fill: var(--color-brand);
		opacity: 0.5;
	}
	.curve {
		fill: none;
		stroke: var(--color-brand);
		stroke-width: 1.5;
		opacity: 0.9;
	}
	.median {
		stroke: var(--text-2);
		stroke-width: 1;
		stroke-dasharray: 2 2;
		opacity: 0.7;
	}
	input[type='range'] {
		width: 100%;
		accent-color: var(--color-brand);
		cursor: pointer;
	}
	.cap {
		margin: 0;
		font-size: 0.74rem;
		line-height: 1.35;
		color: var(--text-muted);
	}
	.cap strong {
		color: var(--text-2);
	}
	.cap code {
		font-family: var(--font-mono);
		color: var(--text-2);
	}
</style>
