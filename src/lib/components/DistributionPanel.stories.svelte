<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import type { LineResult } from '$lib/engine';
import DistributionPanel from './DistributionPanel.svelte';

const hist = Array.from({ length: 30 }, (_, i) => Math.round(100 * Math.exp(-((i - 13) ** 2) / 30)));

const distLine: LineResult = {
	index: 0,
	kind: 'value',
	raw: 'load = (800 to 1200) req/s',
	isDist: true,
	display: { kind: 'dist', unit: 'req/s', p5: '850', p50: '1000', p95: '1180', text: '1000 (850 … 1180) req/s' },
	summary: {
		kind: 'dist',
		dim: {},
		mean: 1005,
		sd: 110,
		min: 760,
		max: 1290,
		p5: 850,
		p25: 930,
		p50: 1000,
		p75: 1075,
		p95: 1180,
		skew: 0.05,
		hist,
		histMin: 760,
		histMax: 1290
	}
};

const pointLine: LineResult = {
	index: 0,
	kind: 'value',
	raw: 'x = 5 m',
	display: { kind: 'point', unit: 'm', value: '5', text: '5 m' }
};

const { Story } = defineMeta({
	title: 'Calcy/DistributionPanel',
	component: DistributionPanel,
	tags: ['autodocs'],
	args: { line: distLine, fmt: 'auto' }
});
</script>

<Story name="Distribution" />

<Story name="No distribution (fallback)" args={{ line: pointLine }} />
