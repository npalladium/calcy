<script lang="ts">
// Presentation-only: the technical "how it works" doc, shown in the DocOverlay.
import DocOverlay from './DocOverlay.svelte';

let { onclose }: { onclose: () => void } = $props();
</script>

<DocOverlay title="How it works" {onclose}>
	<p class="lead">
		calcy is a single-page app that runs entirely in your browser. There is no backend: parsing,
		simulation, and storage all happen on your device.
	</p>

	<h3>Everything is a distribution</h3>
	<p>
		Every value is an N-sample Monte-Carlo distribution (10,000 draws by default). A plain number
		like <code>5 kg</code> is just a 1-sample distribution; a range like <code>(2 to 4) kg</code> is
		10,000 draws fitted to your interval. Arithmetic is applied <strong>element-wise</strong> across
		the samples, so uncertainty propagates automatically — no calculus, no error-propagation
		formulas.
	</p>
	<p>
		Scalars stay scalar (and allocation-free) until they first meet a distribution, which keeps
		ordinary math fast. Re-using a variable keeps its draws correlated — <code>x - x</code> is
		exactly zero, and a sensitivity view can attribute output variance back to each input.
	</p>
	<p>
		Known families (normal, lognormal, uniform, beta, …) also carry a parametric tag, so
		<code>mean()</code> and percentiles can be read from a <strong>closed form</strong> instead of
		the noisy sample estimate, while the samples still drive the sparkline and the displayed range.
	</p>

	<h3>Units &amp; dimensions</h3>
	<p>
		Units come from a curated, hand-owned catalogue (no general units engine) with a generic
		SI-prefix expander. Every quantity is stored in <strong>canonical base units</strong> (m, kg, s,
		A, K, …), so conversions are exact and dimensional errors surface immediately. The dimension
		algebra is what makes <code>V / A → Ω</code> and <code>kΩ · µF → ms</code> just work.
	</p>
	<p>Beyond plain multiplicative units, the catalogue models:</p>
	<ul>
		<li><strong>Affine</strong> units — °C/°F and gauge pressure (an offset, not just a scale)</li>
		<li><strong>Logarithmic</strong> units — dB/dBm/dBW (a ratio on a log scale)</li>
		<li><strong>Bridges</strong> — declared equivalences (molar mass, density, FX rate) that let a value cross dimensions via a known factor</li>
		<li><strong>Currencies &amp; counts</strong> — each its own base dimension, so they never mix by accident</li>
	</ul>

	<h3>The language</h3>
	<p>
		A small recursive-descent parser turns each line into an expression tree. Bare units are values
		(magnitude 1), so <code>req/s</code> and <code>60 km / 1 h</code> fall out of ordinary arithmetic
		plus implicit multiplication. <code>in</code> (convert) and <code>to</code> (confidence interval)
		are kept disjoint, which removes the parser's most context-sensitive decision and the ambiguity
		that came with it.
	</p>

	<h3>Where the work runs</h3>
	<ul>
		<li>The engine runs in a <strong>Web Worker</strong>, so simulating thousands of samples never blocks the UI.</li>
		<li>Sheets are stored locally in an in-browser <strong>SQLite</strong> database (OPFS) — they stay on this device.</li>
		<li><strong>Share</strong> packs a whole sheet into the URL; opening that link reconstructs it with no server involved.</li>
		<li>Each sheet seeds its random generator deterministically, so a sheet re-evaluates to the same numbers until you <strong>Re-roll</strong>.</li>
	</ul>

	<h3>How the code is organised</h3>
	<p>
		The app follows a functional-core / imperative-shell split: a pure engine and pure sheet logic
		(parse, evaluate, format) with no I/O, wrapped by a thin controller that owns state and effects,
		and presentation-only Svelte components. That separation is why the engine is covered by a large
		suite of unit, property, and golden tests.
	</p>

	<p class="lead">No network, no telemetry, no account. It's a calculator that happens to take uncertainty seriously.</p>
</DocOverlay>
