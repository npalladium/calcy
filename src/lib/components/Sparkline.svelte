<script lang="ts">
// Inline SVG histogram — no chart library.
let {
	hist,
	width = 120,
	height = 28,
	color = 'var(--accent)'
}: { hist: number[]; width?: number; height?: number; color?: string } = $props();

const max = $derived(Math.max(1, ...hist));
const bw = $derived(width / hist.length);
</script>

<svg
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	preserveAspectRatio="none"
	role="img"
	aria-label="distribution histogram"
>
	{#each hist as h, i (i)}
		{@const bh = (h / max) * height}
		<rect x={i * bw} y={height - bh} width={Math.max(0.5, bw - 0.5)} height={bh} fill={color} />
	{/each}
</svg>
