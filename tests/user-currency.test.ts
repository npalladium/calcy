import { describe, expect, it } from 'vitest';
import { lines, makeEngine, num, one } from './helpers';

// User-defined currencies — the `currency` directive mints a brand-new base
// dimension (unlike `unit btc = 50000 $`, which only aliases dollars). Aliases
// share one dimension; the currency is isolated from others and bridges via FX.

describe('currency directive', () => {
	it('declares a usable currency', () => {
		expect(num('currency BTC\n10 BTC in BTC')).toBe(10);
	});

	it('comma-separated aliases share one dimension', () => {
		expect(num('currency BTC, btc, bitcoin\n5 btc + 5 bitcoin in BTC')).toBe(10);
	});

	it('displays with the declared name', () => {
		expect(one('currency BTC\n10 BTC').display?.text).toBe('10 BTC');
	});

	it('is its own dimension — not mixable with built-in currencies', () => {
		expect(one('currency BTC\n1 BTC + $1').error).toBeTruthy();
	});

	it('is distinct from a same-named alias unit (own base dim, not dollars)', () => {
		// `unit` would alias dollars; `currency` is a separate dimension.
		expect(one('currency BTC\n1 BTC in $').error).toBeTruthy();
	});

	it('rejects an invalid name', () => {
		// A bare directive renders as a unitdef-kind line, not a value line.
		expect(lines('currency 1coin').at(-1)?.error).toBeTruthy();
	});
});

describe('user currency FX via bridge', () => {
	it('bridges a custom currency to USD and back', () => {
		expect(num('currency BTC\nbridge r = 50000 $/BTC\n2 BTC in $ via r')).toBeCloseTo(100000, 4);
		expect(num('currency BTC\nbridge r = 50000 $/BTC\n100000 $ in BTC via r')).toBeCloseTo(2, 9);
	});

	it('bridges between two custom currencies', () => {
		const sheet = 'currency BTC\ncurrency ETH\nbridge r = 15 ETH/BTC\n2 BTC in ETH via r';
		expect(num(sheet)).toBeCloseTo(30, 6);
	});
});

describe('re-evaluation is idempotent', () => {
	it('declaring the same currency twice on one engine is fine', () => {
		const e = makeEngine();
		const sheet = 'currency BTC\n3 BTC in BTC';
		expect(e.evalSheet(sheet).lines.at(-1)?.error).toBeFalsy();
		expect(e.evalSheet(sheet).lines.at(-1)?.error).toBeFalsy();
	});
});
