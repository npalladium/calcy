<script lang="ts">
// Presentation-only: the top toolbar. Title binds to the controller; every
// button forwards an intent to it.
import type { SheetController } from '$lib/state/sheet.svelte';

let { c }: { c: SheetController } = $props();
</script>

<header>
	<strong class="logo">Calcy</strong>
	<input class="title" bind:value={c.title} aria-label="sheet title" />
	<div class="spacer"></div>
	<div class="modes" role="tablist" aria-label="editor mode">
		<button role="tab" aria-selected={c.mode === 'notepad'} class:active={c.mode === 'notepad'} onclick={() => c.setMode('notepad')}>Notepad</button>
		<button role="tab" aria-selected={c.mode === 'tape'} class:active={c.mode === 'tape'} onclick={() => c.setMode('tape')}>Tape</button>
	</div>
	<button onclick={() => c.newSheet()}>New</button>
	<button class:active={c.showTemplates} onclick={() => c.toggleTemplates()} title="Start from an example">Examples</button>
	<button class:active={c.showSheets} onclick={() => c.toggleSheets()} title="Browse & search sheets (⌘K)">Sheets</button>
	<button class:active={c.showHistory} onclick={() => c.openHistory()} title="Revision history of this sheet">History</button>
	<button class:active={c.copied} onclick={() => c.copySheet()} title="Copy sheet + results to clipboard">{c.copied ? '✓ Copied' : 'Copy'}</button>
	<button class:active={c.shared} onclick={() => c.shareLink()} title="Copy a shareable link (sheet packed into the URL)">{c.shared ? '✓ Link' : 'Share'}</button>
	<button class:pulse={c.rerolled} onclick={() => c.reroll()} title="Resample with a new seed (⌘↵)">Re-roll</button>
	<button class:active={c.showHelp} onclick={() => c.toggleHelp()} title="Syntax cheat sheet (⌘/)" aria-label="help">?</button>
	<button class:active={c.showSettings} onclick={() => c.toggleSettings()} aria-label="settings">⚙</button>
</header>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface-1);
		flex-wrap: wrap;
	}
	.logo {
		color: var(--color-brand);
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.title {
		background: transparent;
		border: 1px solid transparent;
		color: var(--text);
		font-size: 1rem;
		padding: 0.2rem 0.4rem;
		border-radius: 6px;
		min-width: 6rem;
	}
	.title:hover,
	.title:focus {
		border-color: var(--border-strong);
		outline: none;
	}
	.spacer {
		flex: 1;
		min-width: 0.5rem;
	}
	header button,
	.modes button {
		background: var(--surface-2);
		border: 1px solid var(--border);
		color: var(--text-2);
		padding: 0.3rem 0.6rem;
		border-radius: 7px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	header button:hover {
		border-color: var(--color-brand);
	}
	header button.active {
		border-color: var(--color-brand);
		color: var(--text);
		background: var(--surface-accent);
	}
	.modes {
		display: flex;
		gap: 2px;
		margin-right: 0.5rem;
	}
	.modes button.active {
		background: var(--color-brand);
		color: var(--text);
		border-color: var(--color-brand);
	}
	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 rgb(var(--color-accent-rgb) / 0.6);
		}
		100% {
			box-shadow: 0 0 0 8px rgb(var(--color-accent-rgb) / 0);
		}
	}
	header button.pulse {
		animation: pulse 0.45s ease-out;
		border-color: var(--color-brand);
	}
</style>
