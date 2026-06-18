<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import Sparkline from './Sparkline.svelte';

const bell = Array.from({ length: 30 }, (_, i) => Math.round(100 * Math.exp(-((i - 15) ** 2) / 40)));
const skew = Array.from({ length: 30 }, (_, i) => Math.round(120 * Math.exp(-i / 8) + 3));

const { Story } = defineMeta({
	title: 'Calcy/Sparkline',
	component: Sparkline,
	tags: ['autodocs'],
	args: { hist: bell, width: 220, height: 64 }
});
</script>

<Story name="Bell" />
<Story name="Skewed" args={{ hist: skew }} />
<Story name="Rate colour" args={{ color: 'var(--c-rate)' }} />
<Story name="Tiny (inline)" args={{ width: 48, height: 16 }} />
