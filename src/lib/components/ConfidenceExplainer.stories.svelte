<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import { fn } from 'storybook/test';
import ConfidenceExplainer from './ConfidenceExplainer.svelte';

const { Story } = defineMeta({
	title: 'Calcy/ConfidenceExplainer',
	component: ConfidenceExplainer,
	tags: ['autodocs'],
	args: { level: 0.9, onCommit: fn() }
});
</script>

<Story name="90% (default)" />
<Story name="80%" args={{ level: 0.8 }} />
<Story name="99%" args={{ level: 0.99 }} />
