<script lang="ts">
// Presentation-only: a slim footer bar with links to the long-form docs, a bug
// report, and the privacy note. Intents forward to the controller.
import type { SheetController } from '$lib/state/sheet.svelte';

let { c }: { c: SheetController } = $props();

const ISSUE_URL = 'https://github.com/npalladium/calcy/issues/new';

// Open a prefilled bug report. The sheet itself isn't put in the URL — a packed
// share link can be multiple KB and GitHub silently truncates long prefills — so
// instead we copy a share link to the clipboard for the user to paste into the
// form. Only the small browser-env field is prefilled via the URL. Built at click
// time so prerender never touches `navigator`/`location`.
function reportBug() {
	try {
		navigator.clipboard?.writeText(c.shareUrl());
	} catch {
		// clipboard unavailable — the form still works, just without the paste.
	}
	const params = new URLSearchParams({ template: 'bug_report.yml' });
	if (typeof navigator !== 'undefined') params.set('environment', navigator.userAgent);
	window.open(`${ISSUE_URL}?${params}`, '_blank', 'noopener,noreferrer');
}
</script>

<footer>
	<nav aria-label="documentation">
		<button class="link" onclick={() => c.openGuide()}>Guide</button>
		<span class="dot" aria-hidden="true">·</span>
		<button class="link" onclick={() => c.openHowItWorks()}>How it works</button>
		<span class="dot" aria-hidden="true">·</span>
		<button
			class="link"
			onclick={reportBug}
			title="Copies a share link to your clipboard, then opens a prefilled bug report">Report a bug ↗</button
		>
	</nav>
	<span class="note">Runs locally — no network, no account.</span>
</footer>

<style>
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.3rem 0.9rem;
		border-top: 1px solid var(--border);
		background: var(--surface-1);
		font-size: 0.76rem;
		color: var(--text-muted);
		flex-wrap: wrap;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--text-2);
		font: inherit;
		text-decoration: none;
	}
	.link:hover {
		color: var(--color-brand);
		text-decoration: underline;
	}
	.dot {
		color: var(--text-faint);
	}
	.note {
		color: var(--text-faint);
	}
</style>
