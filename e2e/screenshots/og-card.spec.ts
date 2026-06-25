// Renders the social-graph preview card to static/og.png. The card's content is
// built from calcy's own engine output (see scripts/og-card.ts), so this is a
// build-time asset generator, not a regression test. Crawlers fetch the PNG by
// absolute URL (see app.html). Regenerate with `pnpm gen:og`; commit the result.
import { test } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { computeScenario, H, renderCardHtml, W } from '../../scripts/og-card';

test('render og.png social card', async ({ page }) => {
	await page.setViewportSize({ width: W, height: H });
	await page.setContent(renderCardHtml(computeScenario()), { waitUntil: 'networkidle' });
	// Let system fonts settle so the text metrics are stable across runs.
	await page.evaluate(() => document.fonts.ready);
	const out = path.join('static', 'og.png');
	await fs.mkdir(path.dirname(out), { recursive: true });
	await page.locator('.card').screenshot({ path: out, type: 'png' });
});
