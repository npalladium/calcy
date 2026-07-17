<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import type { DisplayValue } from '$lib/engine';
import ResultText from './ResultText.svelte';

// A pinned label whose base decomposition differs — hover the unit to see it.
const pinned: DisplayValue = { kind: 'point', unit: 'km/h', baseUnit: 'm/s', value: '100', text: '100 km/h' };
// A named derived unit — `W` decomposes to `m² kg/s³`.
const watt: DisplayValue = { kind: 'point', unit: 'W', baseUnit: 'm² kg/s³', value: '1', text: '1 W' };
// A distribution — the unit still trails the interval.
const dist: DisplayValue = {
	kind: 'dist',
	unit: 'km/h',
	baseUnit: 'm/s',
	p5: '83.5',
	p50: '99.8',
	p95: '116',
	ciLow: '83.5',
	ciHigh: '116',
	level: 0.9,
	text: '99.8 (83.5 … 116) km/h'
};
// Dimensionless — no unit, no hover.
const bare: DisplayValue = { kind: 'point', unit: '', value: '5', text: '5' };
// Money — the symbol is embedded, so there's no trailing unit to decompose.
const money: DisplayValue = { kind: 'point', unit: 'usd', baseUnit: '$', value: '1234.5', text: '$1,234.50' };

const { Story } = defineMeta({
	title: 'Calcy/ResultText',
	component: ResultText,
	tags: ['autodocs'],
	args: { display: pinned }
});
</script>

<Story name="Pinned unit (hover to decompose)" />
<Story name="Named derived unit" args={{ display: watt }} />
<Story name="Distribution" args={{ display: dist }} />
<Story name="Dimensionless (no hover)" args={{ display: bare }} />
<Story name="Money (no trailing unit)" args={{ display: money }} />
