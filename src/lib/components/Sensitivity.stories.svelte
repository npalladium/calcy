<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import type { EngineClient } from '$lib/engine/client';
import Sensitivity from './Sensitivity.svelte';

// A stub engine that returns a fixed variance breakdown — the component only
// calls `sensitivity(index)`.
const mockEngine = {
	sensitivity: async () => [
		{ name: 'load', r2: 0.62 },
		{ name: 'write', r2: 0.27 },
		{ name: 'latency', r2: 0.08 }
	]
} as unknown as EngineClient;

const { Story } = defineMeta({
	title: 'Calcy/Sensitivity',
	component: Sensitivity,
	tags: ['autodocs'],
	args: { engine: mockEngine, index: 0, tick: 0 }
});
</script>

<Story name="Variance breakdown" />
