import { describe, expect, it } from 'vitest';
import { computeScenario } from '../scripts/og-card';

// Guards the OG card's data source (scripts/og-card.ts). The PNG itself can't be
// byte-compared (font rendering varies by machine), so instead we pin the engine
// output the card is built from: if calcy's display output for the scenario ever
// changes, this fails — regenerate the image with `pnpm gen:og`.
describe('OG card scenario is authentic and stable', () => {
	const s = computeScenario();

	it('every row evaluates without error and carries a 30-bin histogram', () => {
		expect(s.rows).toHaveLength(4);
		for (const r of s.rows) {
			expect(r.mid, r.label).toBeTruthy();
			expect(r.hist.length, r.label).toBe(30);
		}
	});

	it('shows the pinned engine output (run `pnpm gen:og` if this changes)', () => {
		const shown = s.rows.map((r) => `${r.label} → ${r.mid} (${r.lo} … ${r.hi}) ${r.unit}`);
		expect(shown).toEqual([
			'pace = (5 to 6) min/km → 5.48 (5 … 6) min/km',
			'time = 10 km × pace in min → 54.8 (50 … 60) min',
			'speed = 10 km / time in km/h → 11 (10 … 12) km/h',
			'burn = 600 kcal/h × time in kcal → 548 (500 … 600) kcal'
		]);
	});
});
