// Screenshot capture helper for Playwright.
//
// Adapted from we360/web-v2's e2e/screenshots/capture.ts (the project's
// reusable Playwright screenshotter). Trimmed for calcy: it is a single-route
// app whose UI states are driven by editor content rather than navigation, so
// the route walker is gone and "app rendered" waits on the editor instead of an
// AntD spinner. The two patterns kept are the ones that matter everywhere:
//   • freeze animations/carets so shots are deterministic, and
//   • auto-named PNGs written to test-results/screenshots/.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';

const OUT_DIR = path.join('test-results', 'screenshots');

export interface CaptureOptions {
	/** A locator that must be visible before the shot is taken. */
	ready?: string | Locator;
	/** Capture the whole scrollable page rather than just the viewport. Default: false. */
	fullPage?: boolean;
	/** Disable transitions/animations/caret while capturing. Default: true. */
	freezeAnimations?: boolean;
	/** Clip the shot to a single element (overrides fullPage). */
	clip?: string | Locator;
	/** Max ms to wait for `ready`/`clip`. Default: 10000. */
	timeoutMs?: number;
}

/** Wait until calcy's editor has mounted (and any explicit `ready` selector). */
export async function waitForAppRendered(
	page: Page,
	options: { timeoutMs?: number; ready?: string | Locator } = {}
): Promise<void> {
	const timeout = options.timeoutMs ?? 10000;
	await page.locator('.cm-editor').first().waitFor({ state: 'visible', timeout });
	if (options.ready) {
		const loc = typeof options.ready === 'string' ? page.locator(options.ready) : options.ready;
		await loc.first().waitFor({ state: 'visible', timeout });
	}
}

/** Disable CSS transitions/animations so a shot can't land mid-transition. */
async function freeze(page: Page): Promise<void> {
	await page.addStyleTag({
		content: `*, *::before, *::after {
			transition: none !important;
			animation: none !important;
			caret-color: transparent !important;
		}`
	});
}

/**
 * Capture the current page state to `test-results/screenshots/<name>.png`.
 * Returns the path and byte size so a spec can assert the shot was written.
 */
export async function capture(
	page: Page,
	name: string,
	options: CaptureOptions = {}
): Promise<{ filePath: string; bytes: number }> {
	const timeout = options.timeoutMs ?? 10000;
	if (options.ready) {
		const loc = typeof options.ready === 'string' ? page.locator(options.ready) : options.ready;
		await loc.first().waitFor({ state: 'visible', timeout });
	}
	if (options.freezeAnimations ?? true) await freeze(page);

	const filePath = path.join(OUT_DIR, `${slugify(name)}.png`);
	await fs.mkdir(path.dirname(filePath), { recursive: true });

	let buf: Buffer;
	if (options.clip) {
		const loc = typeof options.clip === 'string' ? page.locator(options.clip) : options.clip;
		buf = await loc.first().screenshot({ type: 'png', path: filePath });
	} else {
		buf = await page.screenshot({ type: 'png', path: filePath, fullPage: options.fullPage ?? false });
	}
	return { filePath, bytes: buf.length };
}

/** Slugify a shot name into a portable filename. */
function slugify(name: string): string {
	return name
		.trim()
		.replace(/[^a-zA-Z0-9_.-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/** Assert a screenshot file exists and is non-trivial in size. */
export async function expectScreenshotWritten(filePath: string, minBytes = 2000): Promise<void> {
	const stat = await fs.stat(filePath);
	expect(stat.size).toBeGreaterThan(minBytes);
}
