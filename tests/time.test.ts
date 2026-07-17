import { describe, expect, it } from 'vitest';
import { relativeTime } from '../src/lib/sheet/time';

const now = 1_000_000_000_000;
const ago = (ms: number) => relativeTime(now - ms, now);

describe('relativeTime', () => {
  it('reports "just now" under ~30s (rounds to the nearest minute)', () => {
    expect(ago(0)).toBe('just now');
    expect(ago(29_000)).toBe('just now');
    expect(ago(30_000)).toBe('1m ago'); // 30s rounds up to 1 minute
  });
  it('reports minutes under an hour', () => {
    expect(ago(60_000)).toBe('1m ago');
    expect(ago(59 * 60_000)).toBe('59m ago');
  });
  it('reports hours under a day', () => {
    expect(ago(60 * 60_000)).toBe('1h ago');
    expect(ago(23 * 60 * 60_000)).toBe('23h ago');
  });
  it('reports days beyond that', () => {
    expect(ago(24 * 60 * 60_000)).toBe('1d ago');
    expect(ago(5 * 24 * 60 * 60_000)).toBe('5d ago');
  });
});
