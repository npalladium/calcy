<script lang="ts">
// Presentation-only: the user guide. Prose is authored as Markdown in
// $lib/docs/guide.svx (compiled by mdsvex) and rendered inside the DocOverlay
// reader. The live, click-to-insert syntax reference is the separate cheat
// sheet (HelpPanel).
import Guide from '$lib/docs/guide.svx';
import DocOverlay from './DocOverlay.svelte';

let { onclose }: { onclose: () => void } = $props();
</script>

<DocOverlay title="Guide" {onclose}>
	<Guide />
</DocOverlay>
