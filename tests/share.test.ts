import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from '../src/lib/share';

describe('share encoding', () => {
	it('round-trips a sheet payload', () => {
		const p = { title: 'Capacity', body: 'rate = 12_000 req/s\nrate in req/day', seed: 12345 };
		expect(decodeShare(encodeShare(p))).toEqual(p);
	});

	it('survives unicode and newlines', () => {
		const p = { title: 'café ☕', body: '# π ≈ 3.14\nx = 1 to 10', seed: 7 };
		expect(decodeShare(encodeShare(p))).toEqual(p);
	});

	it('returns null on garbage', () => {
		expect(decodeShare('not-base64-$$$')).toBeNull();
		expect(decodeShare('')).toBeNull();
	});

	it('returns null when the decoded shape is wrong', () => {
		expect(decodeShare(btoa(JSON.stringify({ title: 'x' })))).toBeNull();
	});
});
