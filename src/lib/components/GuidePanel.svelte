<script lang="ts">
// Presentation-only: the user guide. Prose is authored as Markdown in
// $lib/docs/guide.md (compiled by mdsvex) and rendered inside the DocOverlay
// reader. The live, click-to-insert syntax reference is the separate cheat
// sheet (HelpPanel); the full written reference is ReferencePanel.
import Guide from '$lib/docs/guide.md';
import DocOverlay from './DocOverlay.svelte';

let { onclose }: { onclose: () => void } = $props();
</script>

<DocOverlay title="Guide" {onclose}>
	<Guide />
</DocOverlay>
