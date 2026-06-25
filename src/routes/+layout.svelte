<script lang="ts">
import { onMount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import '../app.css';

let { children } = $props();

// @vite-pwa/sveltekit generates the service worker + precache but does NOT register
// it for us, so without this the app never works offline despite shipping a manifest.
// `immediate` registers on load instead of waiting for the next navigation; with
// registerType 'autoUpdate' the SW also refreshes itself when a new build deploys.
onMount(() => {
	registerSW({ immediate: true });
});
</script>

{@render children()}
