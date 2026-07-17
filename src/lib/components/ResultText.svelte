<script lang="ts">
// Presentation-only: a formatted result line where the trailing unit label is
// a hoverable <abbr> whose tooltip decomposes it into canonical base units
// (`km/h` → `m/s`, `mi` → `m`). The abbreviation→expansion semantics of <abbr>
// are exactly the unit→base-units relationship.
//
// The engine bakes the unit into `display.text` as a trailing ` <unit>` suffix
// (see format.ts). We split on that known contract so the number keeps its
// K/M/B formatting and only the unit becomes the hover target. When there's no
// splittable unit (dimensionless, or money where the symbol is embedded, e.g.
// `$1,234`), we render the text verbatim with no hover affordance.
import type { DisplayValue } from '$lib/engine';

let { display }: { display: DisplayValue } = $props();

// Splittable only when a base decomposition exists AND the text ends with the
// exact ` <unit>` suffix the formatter appends. Money (`$1,234`) has no such
// suffix, so it falls through to the plain branch.
const split = $derived.by(() => {
	const { text, unit, baseUnit } = display;
	if (!unit || !baseUnit) return null;
	const suffix = ` ${unit}`;
	if (!text.endsWith(suffix)) return null;
	return { body: text.slice(0, -suffix.length), unit, baseUnit };
});
</script>

{#if split}{split.body} <abbr class="unit" title={`base units: ${split.baseUnit}`}>{split.unit}</abbr>{:else}{display.text}{/if}

<style>
	/* Subtle at rest so a sheet full of plain units isn't visually noisy; the
	   help cursor and dotted underline appear on hover to signal the tooltip. */
	.unit {
		text-decoration: none;
		cursor: help;
	}
	.unit:hover {
		text-decoration: underline dotted;
		text-underline-offset: 3px;
	}
</style>
