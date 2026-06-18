<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import type { DisplayValue, LineResult, RatePeriod } from '$lib/engine';
import RateCard from './RateCard.svelte';

const dv = (text: string): DisplayValue => ({ kind: 'point', unit: '', value: text, text });

const line: LineResult = {
	index: 0,
	kind: 'value',
	raw: 'rate = 12_000 req/s',
	name: 'rate',
	isRate: true,
	display: dv('12000 req/s'),
	rateCard: [
		{ period: 'second', display: dv('12,000 req/s') },
		{ period: 'minute', display: dv('720,000 req/min') },
		{ period: 'hour', display: dv('43.2M req/h') },
		{ period: 'day', display: dv('1.04B req/day') }
	]
};

// Stub the engine's accumulate call so the card is self-contained.
const accumulate = async (_i: number, period: RatePeriod, count: number) =>
	dv(`≈ ${count} ${period}${count === 1 ? '' : 's'} of traffic`);

const { Story } = defineMeta({
	title: 'Calcy/RateCard',
	component: RateCard,
	tags: ['autodocs'],
	args: { line, accumulate }
});
</script>

<Story name="Rate card" />
