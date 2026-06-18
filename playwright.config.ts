import { defineConfig, devices } from '@playwright/test';

// Playwright drives the screenshot capture (see e2e/screenshots/). It boots the
// Vite dev server itself, so `pnpm test:screenshots` is a one-liner. Specs live
// under e2e/ and are kept out of the Vitest `include` glob, so the two runners
// never collide.
export default defineConfig({
	testDir: 'e2e',
	outputDir: 'test-results/playwright',
	fullyParallel: true,
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'pnpm dev --port 5173',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
