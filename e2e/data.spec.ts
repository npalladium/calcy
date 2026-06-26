// Data backup/restore + danger-zone flows, exercised through the real DB worker
// (migrations, JSON export/import merge, clear). Each test gets a fresh OPFS
// context, so destructive actions here only touch the test's own database.

import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs/promises';

function shareHash(body: string, title: string): string {
	const json = JSON.stringify({ title, body, seed: 0x9e3779b9 });
	return Buffer.from(encodeURIComponent(json)).toString('base64');
}

async function loadSheet(page: Page, body: string, title: string) {
	await page.goto(`/#${shareHash(body, title)}`);
	await page.locator('.cm-editor').first().waitFor({ state: 'visible' });
}

async function openSettings(page: Page) {
	await page.getByRole('button', { name: 'settings' }).click();
	await page.locator('.panel.settings').waitFor({ state: 'visible' });
}

test('exports a versioned JSON backup containing the sheet', async ({ page }) => {
	await loadSheet(page, 'rent = 1800 $', 'Budget');
	await openSettings(page);

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Export JSON' }).click()
	]);
	const path = await download.path();
	const doc = JSON.parse(await fs.readFile(path, 'utf8'));

	expect(doc.version).toBe(1);
	expect(typeof doc.exported_at).toBe('string');
	expect(doc.sheets.some((s: { title: string; body: string }) => s.title === 'Budget' && s.body === 'rent = 1800 $')).toBe(true);
});

test('clearing all sheets then re-importing the backup restores them (merge)', async ({ page }) => {
	await loadSheet(page, 'rent = 1800 $', 'Budget');
	await openSettings(page);

	// Export the current sheet to a JSON file we can re-import.
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Export JSON' }).click()
	]);
	const backupPath = await download.path();

	// Clear all sheets (the confirm() dialog must be accepted).
	page.on('dialog', (d) => d.accept());
	await page.getByRole('button', { name: 'Clear', exact: true }).click();
	await expect(page.locator('.data-msg')).toContainText('cleared');

	// The Budget sheet is gone from the browser.
	await page.getByRole('button', { name: 'Sheets' }).click();
	await page.getByRole('menuitem', { name: 'Browse sheets' }).click();
	await expect(page.locator('.float')).toBeVisible();
	await expect(page.locator('.float')).not.toContainText('Budget');
	// Escape closes every overlay, settings included — reopen it for the import.
	await page.keyboard.press('Escape');
	await openSettings(page);

	// Re-import the backup; the merge brings Budget back.
	await page.locator('input[type="file"][accept*="json"]').setInputFiles(backupPath);
	await expect(page.locator('.data-msg')).toContainText('Imported');

	await page.getByRole('button', { name: 'Sheets' }).click();
	await page.getByRole('menuitem', { name: 'Browse sheets' }).click();
	await expect(page.locator('.float')).toContainText('Budget');
});
