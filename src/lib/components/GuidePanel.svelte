<script lang="ts">
// Presentation-only: the user guide, shown in the full-screen DocOverlay reader.
// Prose is hand-authored here; the live, click-to-insert syntax reference is the
// separate cheat-sheet (HelpPanel).
import DocOverlay from './DocOverlay.svelte';

let { onclose }: { onclose: () => void } = $props();
</script>

<DocOverlay title="Guide" {onclose}>
	<p class="lead">
		calcy is a calculator that understands <strong>units</strong> and
		<strong>uncertainty</strong>. Type plain math, get an answer — and when an input is a range
		instead of a single number, calcy carries that uncertainty through to the result.
	</p>

	<h3>The basics</h3>
	<p>Type an expression on each line. Units are first-class, so arithmetic stays dimensionally honest:</p>
	<pre><code>5 km + 3 mi          → 9.83 km
12 V / 4 ohm         → 3 A
1 kWh / 60 W         → 16.7 hour</code></pre>
	<p>Mixing incompatible units is an error (<code>10 m + 5 s</code>), so a wrong formula is caught, not silently computed.</p>

	<h3>Uncertainty</h3>
	<p>Write a range instead of a number and calcy runs a Monte-Carlo simulation, propagating the spread through every step:</p>
	<pre><code>load = (800 to 1200) req/s     # a 90% confidence interval
peak = load * 1.5
peak in req/day</code></pre>
	<p>
		A range result shows the <strong>median</strong> and the
		<strong>likely range</strong> (5th–95th percentile). Other ways to express uncertainty:
	</p>
	<ul>
		<li><code>3 ± 1 day</code> — symmetric interval</li>
		<li><code>about 5 kg</code> / <code>~5 kg</code> — a rough ±10%</li>
		<li><code>p10: 5, p90: 50</code> — pin your own percentiles</li>
		<li><code>normal(100, 15)</code>, <code>lognormal(5, 50)</code>, <code>poisson(1000)</code> — named distributions</li>
	</ul>

	<h3>Convert vs. range: <code>in</code> and <code>to</code></h3>
	<p>These are deliberately separate, so there's never any guessing:</p>
	<ul>
		<li><code>in</code> <strong>converts</strong> units — <code>5 km in mi</code> → 3.11 mi</li>
		<li><code>to</code> builds a <strong>confidence interval</strong> — <code>5 to 10 kg</code></li>
	</ul>
	<p>If you write <code>5 km to mi</code> expecting a conversion, calcy catches the reversed interval and points you at <code>in</code>.</p>

	<h3>Variables, comments, and one-off locals</h3>
	<pre><code>rate = 12k req/s       # k = ×1000, M = ×1e6
daily = rate * 1 day   # reuse earlier names
margin = price - cost where price = 20, cost = 12</code></pre>
	<p>Anything after <code>#</code> is a comment. <code>sum(above)</code> folds every result line above it.</p>

	<h3>Rates &amp; accumulation</h3>
	<pre><code>12k req/s in req/day          # re-express a rate
(2 to 5) MB/s * 1 day in TB   # accumulate a rate over time</code></pre>

	<h3>Asking questions</h3>
	<pre><code>chance(peak &gt; 1000 req/s)       # probability a condition holds
chance(10 ms &lt; latency &lt; 20 ms) # chained comparison
p(load, 0.95)                   # the 95th percentile
mean(load)  median(load)  sd(load)</code></pre>

	<h3>Money &amp; currencies</h3>
	<p>Currency symbols work as a prefix or postfix and format as money. Each currency is its own dimension, so they never mix silently:</p>
	<pre><code>$5 + 3 $              → $8.00
₹2500000             → ₹2,500,000.00</code></pre>
	<p>Mint your own currency, and convert between them with a <code>bridge</code> exchange rate (you supply the rate — there's no live FX):</p>
	<pre><code>currency BTC, bitcoin
bridge fx = 83 ₹/$
1000 $ in INR via fx          → ₹83,000.00</code></pre>

	<h3>More units</h3>
	<ul>
		<li>Decibels: <code>30 dBm in W</code>, <code>0.1 W in dBm</code>, <code>3 dB</code></li>
		<li>Math: <code>pi</code>, <code>tau</code>, <code>e</code>, and <code>sin</code>/<code>cos</code>/<code>tan</code> (radians; <code>sin(90 deg)</code> works)</li>
		<li>Define your own: <code>unit sprint = 2 week</code></li>
	</ul>

	<h3>Getting around</h3>
	<ul>
		<li><strong>Examples</strong> — start from a ready-made sheet</li>
		<li><strong>?</strong> — the click-to-insert cheat sheet (<code>⌘/</code>)</li>
		<li><code>⌘K</code> sheets · <code>⌘↵</code> re-roll · <code>Esc</code> close</li>
	</ul>

	<p class="lead">Everything runs locally in your browser — no account, no network. Your sheets are saved on this device; <strong>Share</strong> packs a sheet into a link.</p>
</DocOverlay>
