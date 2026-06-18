<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import { fn } from 'storybook/test';
import EntryList, { type Entry } from './EntryList.svelte';

const items: Entry[] = [
	{ id: '1', title: 'Cloud capacity', subtitle: 'rate = 12_000 req/s', current: true },
	{ id: '2', title: 'Mortgage payoff', subtitle: 'pmt(rate, nper, pv)' },
	{ id: '3', title: 'Untitled', subtitle: '' }
];

const { Story } = defineMeta({
	title: 'Calcy/EntryList',
	component: EntryList,
	tags: ['autodocs'],
	args: { items, onpick: fn() }
});
</script>

<Story name="Default" />

<Story name="Empty" args={{ items: [], empty: 'no sheets' }} />

<Story name="With row actions">
	{#snippet template(args)}
		<EntryList {...args}>
			{#snippet actions(it)}
				<button type="button" aria-label="delete {it.title}">✕</button>
			{/snippet}
		</EntryList>
	{/snippet}
</Story>
