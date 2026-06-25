<script lang="ts">
// Presentation-only: the full written reference. Prose is authored as Markdown
// in $lib/docs/reference.md (compiled by mdsvex, also rendered on GitHub) and
// shown inside the DocOverlay reader. The gentle intro is the Guide; the live,
// click-to-insert examples are the cheat sheet (HelpPanel).
import Reference from '$lib/docs/reference.md';
import DocOverlay from './DocOverlay.svelte';

let { onclose }: { onclose: () => void } = $props();
</script>

<DocOverlay title="Reference" {onclose}>
	<Reference />
</DocOverlay>
