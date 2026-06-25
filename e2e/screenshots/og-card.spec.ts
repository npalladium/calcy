// Renders the social-graph preview card (Open Graph / Twitter) to static/og.png.
// It's authored from calcy's own design tokens so the link preview matches the
// app's look. Run with `pnpm test:screenshots og-card`; commit the resulting
// static/og.png. Crawlers fetch that PNG by absolute URL (see app.html), so this
// is a build-time asset generator, not a regression test.
import { test } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// 1200×630 is the canonical Open Graph / Twitter `summary_large_image` size.
const W = 1200;
const H = 630;

const CARD = `<!doctype html><html><head><meta charset="utf-8" /><style>
  :root {
    --ink-0: #0a0a12; --ink-1: #11101c; --ink-2: #1a1830; --ink-3: #272445;
    --violet: #8a7cff; --violet-soft: #c4b1ff; --green: #7ee0a0; --blue: #7fc8ff;
    --text: #ecebf6; --text-2: #c4c2d6; --text-dim: #9a97b5;
    --mono: "SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
    --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; }
  .card {
    width: ${W}px; height: ${H}px; position: relative; overflow: hidden;
    background:
      radial-gradient(1100px 520px at 78% -8%, rgba(138,124,255,0.22), transparent 60%),
      radial-gradient(700px 420px at 8% 112%, rgba(127,200,255,0.12), transparent 60%),
      var(--ink-0);
    font-family: var(--sans); color: var(--text);
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 72px 80px;
  }
  .top { display: flex; align-items: baseline; gap: 22px; }
  .wordmark { font-size: 76px; font-weight: 800; letter-spacing: -0.03em; color: var(--violet); }
  .tagline { font-size: 30px; font-weight: 500; color: var(--text-2); letter-spacing: -0.01em; }
  .panel {
    background: linear-gradient(180deg, rgba(26,24,48,0.85), rgba(17,16,28,0.85));
    border: 1px solid var(--ink-3); border-radius: 18px;
    padding: 34px 40px; font-family: var(--mono); font-size: 30px; line-height: 1.85;
    box-shadow: 0 24px 60px rgba(0,0,0,0.35);
    align-self: stretch;
  }
  .row { display: flex; justify-content: space-between; gap: 40px; white-space: nowrap; }
  .row + .row { margin-top: 2px; }
  .src { color: var(--text-2); }
  .src .kw { color: var(--violet-soft); }
  .res { font-weight: 600; }
  .res.green { color: var(--green); }
  .res.dist { color: var(--violet-soft); }
  .cmt { color: var(--text-dim); }
  .foot { display: flex; align-items: center; gap: 16px; font-size: 24px; color: var(--text-dim); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); display: inline-block; }
</style></head><body>
  <div class="card">
    <div class="top">
      <div class="wordmark">calcy</div>
      <div class="tagline">an uncertainty-aware unit calculator</div>
    </div>
    <div class="panel">
      <div class="row"><span class="src">5 km + 3 mi</span><span class="res green">9.83 km</span></div>
      <div class="row"><span class="src">design = two days <span class="kw">to</span> four days</span><span class="res dist">2.8 (2…4) days</span></div>
      <div class="row"><span class="src">12k req/s <span class="kw">in</span> req/day</span><span class="res green">1.04B req/day</span></div>
      <div class="row"><span class="cmt"># every value is a distribution of a dimensioned quantity</span></div>
    </div>
    <div class="foot"><span class="dot"></span> runs entirely on your device · no account · no network</div>
  </div>
</body></html>`;

test('render og.png social card', async ({ page }) => {
	await page.setViewportSize({ width: W, height: H });
	await page.setContent(CARD, { waitUntil: 'networkidle' });
	// Let system fonts settle so the text metrics are stable across runs.
	await page.evaluate(() => document.fonts.ready);
	const out = path.join('static', 'og.png');
	await fs.mkdir(path.dirname(out), { recursive: true });
	await page.locator('.card').screenshot({ path: out, type: 'png' });
});
