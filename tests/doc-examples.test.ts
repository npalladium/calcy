import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lines } from './helpers';

// The Guide is authored as Markdown and shows worked examples whose result is
// kept in a trailing comment so the line stays copy-pasteable, e.g.
// `$20 + $5  # → $25.00`. Those claims must stay true as the engine evolves, and
// a plausible-looking-but-wrong example is its own kind of bug (see the round
// that added this: `800 to 1200 per day` didn't even parse). So we read the doc,
// run every fenced code example through the real engine, and assert that:
//   - no example line errors (calcy ignores the `#` comment when evaluating), and
//   - any `→ result` annotation matches the engine's display output.
// Code blocks accumulate (later blocks may reference names defined earlier), so
// we evaluate each block with all prior blocks prepended as context.

const ARROW = '→';
const guide = readFileSync(new URL('../src/lib/docs/guide.md', import.meta.url), 'utf8');

function fencedBlocks(md: string): string[] {
	const out: string[] = [];
	const re = /```[^\n]*\n([\s\S]*?)```/g;
	let m: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex-exec loop
	while ((m = re.exec(md)) !== null) out.push(m[1].replace(/\n$/, ''));
	return out;
}

// Split a doc line into its source expression and the expected display text from
// a trailing `→ result` annotation (null when the line has no annotation).
function splitArrow(line: string): [source: string, expected: string | null] {
	const i = line.indexOf(ARROW);
	if (i === -1) return [line, null];
	return [line.slice(0, i).trimEnd(), line.slice(i + ARROW.length).trim()];
}

describe('Guide code examples evaluate as documented', () => {
	const blocks = fencedBlocks(guide);

	it('has the expected number of example blocks', () => {
		expect(blocks.length).toBeGreaterThan(0);
	});

	let prefix: string[] = [];
	blocks.forEach((block, bi) => {
		const raw = block.split('\n');
		const sources = raw.map((l) => splitArrow(l)[0]);
		const expected = raw.map((l) => splitArrow(l)[1]);
		const offset = prefix.length;
		const fullSource = [...prefix, ...sources];

		it(`block ${bi + 1} runs without errors and matches its annotations`, () => {
			const res = lines(fullSource.join('\n'), { numberFormat: 'auto' });
			raw.forEach((_, li) => {
				if (sources[li].trim() === '') return;
				const r = res.find((x) => x.index === offset + li);
				expect(r?.error, `"${sources[li]}" errored`).toBeFalsy();
				if (expected[li] != null) {
					expect(r?.display?.text, `"${sources[li]}"`).toBe(expected[li]);
				}
			});
		});

		prefix = fullSource;
	});
});
