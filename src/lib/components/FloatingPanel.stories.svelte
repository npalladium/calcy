<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import FloatingPanel from './FloatingPanel.svelte';

// FloatingPanel is positioned (top-right) overlay chrome; in the canvas it
// floats to the corner just as it does in the app.
const { Story } = defineMeta({
	title: 'Calcy/FloatingPanel',
	component: FloatingPanel,
	tags: ['autodocs'],
	args: { label: 'example panel' }
});
</script>

<Story name="With content">
	{#snippet template(args)}
		<FloatingPanel label={args.label}>
			<p style="margin: 0; color: var(--text); font-family: var(--font-mono); font-size: 0.85rem;">
				Floating panel content goes here.
			</p>
		</FloatingPanel>
	{/snippet}
</Story>
