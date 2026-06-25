<script lang="ts">
// Presentation-only: a slim footer bar with links to the long-form docs, a bug
// report, and the privacy note. Intents forward to the controller.
import type { SheetController } from '$lib/state/sheet.svelte';

let { c }: { c: SheetController } = $props();

const ISSUE_URL = 'https://github.com/npalladium/calcy/issues/new';

// Build stamp, baked in at build time (see vite.config.ts). The commit links to
// its source on GitHub; 'dev' means it was built outside a git checkout.
const version = __BUILD_VERSION__;
// Show year.month only in the UI; the full CalVer lives in the tooltip.
const displayVersion = version.split('.').slice(0, 2).join('.');
const sha = __BUILD_SHA__;
const commitUrl = sha === 'dev' ? null : `https://github.com/npalladium/calcy/commit/${sha}`;

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
	// Prefill the build so a report is pinned to an exact version + commit.
	params.set('version', `v${version} (${sha})`);
	window.open(`${ISSUE_URL}?${params}`, '_blank', 'noopener,noreferrer');
}
</script>

<footer>
	<nav aria-label="documentation">
		<button class="link" onclick={() => c.openGuide()}>Guide</button>
		<span class="dot" aria-hidden="true">·</span>
		<button class="link" onclick={() => c.openReference()}>Reference</button>
		<span class="dot" aria-hidden="true">·</span>
		<button class="link" onclick={() => c.openHowItWorks()}>How it works</button>
		<span class="dot" aria-hidden="true">·</span>
		<button
			class="link"
			onclick={reportBug}
			title="Copies a share link to your clipboard, then opens a prefilled bug report">Report a bug ↗</button
		>
	</nav>
	<span class="meta">
		<span class="note">Runs locally — no network, no account.</span>
		<span class="dot" aria-hidden="true">·</span>
		{#if commitUrl}
			<a
				class="build"
				href={commitUrl}
				target="_blank"
				rel="noopener noreferrer"
				title={`calcy ${version} · ${sha}`}>v{displayVersion}</a
			>
		{:else}
			<span class="build" title={`calcy ${version} · ${sha}`}>v{displayVersion}</span>
		{/if}
	</span>
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
	.meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.build {
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 0.95em;
		text-decoration: none;
	}
	a.build:hover {
		color: var(--color-brand);
		text-decoration: underline;
	}
</style>
