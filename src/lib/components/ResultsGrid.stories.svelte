<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import { fn } from 'storybook/test';
import type { LineResult } from '$lib/engine';
import ResultsGrid from './ResultsGrid.svelte';

const point = (index: number, raw: string, text: string, extra: Partial<LineResult> = {}): LineResult => ({
	index,
	kind: 'value',
	raw,
	display: { kind: 'point', unit: '', value: text, text },
	...extra
});

const lines: LineResult[] = [
	point(0, 'rate = 12_000 req/s', '12000 req/s', { name: 'rate', isRate: true }),
	point(1, 'rate * 30 day', '31.1B req'),
	{
		index: 2,
		kind: 'value',
		raw: 'load = (800 to 1200) req/s',
		name: 'load',
		isDist: true,
		display: { kind: 'dist', unit: 'req/s', p5: '850', p50: '1000', p95: '1180', text: '1000 (850 … 1180) req/s' }
	},
	{ index: 3, kind: 'value', raw: 'oops + 1', error: "unknown identifier 'oops'", errorHint: 'unknown name' }
];

const { Story } = defineMeta({
	title: 'Calcy/ResultsGrid',
	component: ResultsGrid,
	tags: ['autodocs'],
	args: { lines, selected: 0, onselect: fn() }
});
</script>

<Story name="Mixed results" />

<Story name="Empty" args={{ lines: [] }} />
