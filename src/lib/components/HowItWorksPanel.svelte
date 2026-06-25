<script lang="ts">
// Presentation-only: the conceptual "how it works" doc. Prose is authored as
// Markdown in $lib/docs/how-it-works.md (compiled by mdsvex) and rendered
// inside the DocOverlay reader.
import HowItWorks from '$lib/docs/how-it-works.md';
import DocOverlay from './DocOverlay.svelte';

let { onclose }: { onclose: () => void } = $props();
</script>

<DocOverlay title="How it works" {onclose}>
	<HowItWorks />
</DocOverlay>
