// Builds the social-graph preview card (static/og.png) from calcy's OWN engine
// output — the mid value, the 90% CI, and the histogram sparkline on every row
// are real Monte-Carlo results, not hand-typed numbers, so the card can never
// advertise output the engine doesn't actually produce.
//
//   - e2e/screenshots/og-card.spec.ts renders renderCardHtml() and screenshots
//     it to static/og.png (`pnpm gen:og`).
//   - tests/og-card.test.ts pins computeScenario() so a change in engine output
//     fails CI, prompting a regenerate.
//
// Authored from calcy's design tokens so the link preview matches the app.
import { Engine } from '../src/lib/engine';

// 1200×630 is the canonical Open Graph / Twitter `summary_large_image` size.
export const W = 1200;
export const H = 630;

// A single coherent scenario: a 10K run at an easy, uncertain pace. Each line is
// evaluated as one sheet (later lines reuse earlier names). `*` is shown as `×`.
export const SCENARIO_COMMENT = '# a 10K run at an easy, uncertain pace';
export const SCENARIO_EXPRS = [
  'pace = (5 to 6) min/km',
  'time = 10 km * pace in min',
  'speed = 10 km / time in km/h',
  'burn = 600 kcal/h * time in kcal'
];
// High N for a smooth histogram and crisp CI bounds; fixed seed for a
// reproducible image. The guard test pins the resulting display values.
export const OG_ENGINE_OPTS = { N: 20000, seed: 7, numberFormat: 'auto' as const };

export interface ScenarioRow {
  label: string; // pretty source (× for *)
  mid: string;
  lo: string;
  hi: string;
  unit: string;
  hist: number[];
}
export interface Scenario {
  comment: string;
  rows: ScenarioRow[];
}

export function computeScenario(): Scenario {
  const eng = new Engine(OG_ENGINE_OPTS);
  const lines = eng.evalSheet(SCENARIO_EXPRS.join('\n')).lines;
  const rows = lines.map((l, i): ScenarioRow => {
    if (l.error) throw new Error(`og scenario: "${SCENARIO_EXPRS[i]}" errored: ${l.error}`);
    const d = l.display;
    const stat = (name: string) => d?.stats?.find((s) => s.label === name)?.value ?? '';
    const hist = l.summary?.kind === 'dist' ? l.summary.hist : [];
    return {
      label: SCENARIO_EXPRS[i].replace(/\*/g, '×'),
      mid: stat('median'),
      lo: stat('p5'),
      hi: stat('p95'),
      unit: d?.unit ?? '',
      hist
    };
  });
  return { comment: SCENARIO_COMMENT, rows };
}

// Inline SVG histogram, mirroring src/lib/components/Sparkline.svelte (bars
// normalised to the tallest, drawn bottom-up).
function spark(hist: number[], w = 104, h = 30): string {
  const max = Math.max(1, ...hist);
  const bw = w / hist.length;
  const bars = hist
    .map((v, i) => {
      const bh = (v / max) * h;
      return `<rect x="${(i * bw).toFixed(2)}" y="${(h - bh).toFixed(2)}" width="${Math.max(0.5, bw - 0.7).toFixed(2)}" height="${bh.toFixed(2)}" />`;
    })
    .join('');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="distribution histogram">${bars}</svg>`;
}

// Highlight the `to` / `in` keywords in a source line without touching substrings
// (the surrounding spaces keep `in` out of `min`).
function highlightSrc(label: string): string {
  return label
    .replace(/ to /g, ' <span class="kw">to</span> ')
    .replace(/ in /g, ' <span class="kw">in</span> ');
}

function row(r: ScenarioRow): string {
  return `<div class="row"><span class="src">${highlightSrc(r.label)}</span><span class="res">${spark(r.hist)}<span class="nums"><span class="mid">${r.mid}</span> <span class="rng">(${r.lo} … ${r.hi}) ${r.unit}</span></span></span></div>`;
}

export function renderCardHtml(s: Scenario): string {
  const rows = s.rows.map(row).join('\n      ');
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
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
    display: flex; flex-direction: column; justify-content: flex-start; gap: 28px;
    padding: 60px 80px;
  }
  .top { display: flex; flex-direction: column; gap: 14px; }
  .wordmark { font-size: 84px; font-weight: 800; letter-spacing: -0.03em; color: var(--violet); line-height: 1; }
  .tagline { font-size: 36px; font-weight: 500; color: var(--text-2); letter-spacing: -0.01em; }
  .tagline .hl { color: var(--violet-soft); }
  .panel {
    background: linear-gradient(180deg, rgba(26,24,48,0.85), rgba(17,16,28,0.85));
    border: 1px solid var(--ink-3); border-radius: 18px;
    padding: 30px 40px; font-family: var(--mono); font-size: 28px; line-height: 1.6;
    box-shadow: 0 24px 60px rgba(0,0,0,0.35);
    align-self: stretch;
  }
  .row { display: flex; justify-content: space-between; gap: 40px; white-space: nowrap; }
  .row + .row { margin-top: 2px; }
  .src { color: var(--text-2); }
  .src .kw { color: var(--violet-soft); }
  .res { font-weight: 600; display: inline-flex; align-items: center; gap: 16px; }
  .res .mid { color: var(--green); font-weight: 700; }
  .res .rng { color: var(--violet-soft); }
  .spark { display: block; opacity: 0.92; }
  .spark rect { fill: var(--violet); }
  .cmt { color: var(--text-dim); }
  .foot { display: flex; align-items: center; gap: 16px; font-size: 24px; color: var(--text-dim); margin-top: auto; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); display: inline-block; }
</style></head><body>
  <div class="card">
    <div class="top">
      <div class="wordmark">calcy</div>
      <div class="tagline">Unit-aware, <span class="hl">uncertainty-propagating</span> calculator</div>
    </div>
    <div class="panel">
      <div class="row"><span class="cmt">${s.comment}</span></div>
      ${rows}
    </div>
    <div class="foot"><span class="dot"></span> runs entirely on your device · no account · no network</div>
  </div>
</body></html>`;
}
