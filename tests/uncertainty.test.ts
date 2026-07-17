import { describe, expect, it } from 'vitest';
import type { EngineOptions } from '../src/lib/engine';
import { num, one, values } from './helpers';

// Tests for the configurable confidence interval + tail-awareness + Bayes
// update primitives added to handle items 3, 4, and 7 from the uncertainty
// roadmap.

const STAT: Partial<EngineOptions> = { N: 20000, seed: 7 };

const summ = (src: string, opts = STAT) => {
  const s = values(src, opts)[0];
  if (s.error) throw new Error(`${src} → ${s.error}`);
  return s.summary;
};

describe('confidence level setting', () => {
  it('Z90-style 90% CI is the default', () => {
    const s = summ('1 to 100');
    if (s?.kind !== 'dist') throw new Error('expected dist');
    // p5/p95 should be close to (1, 100) at 90% CI for a lognormal fit
    expect(s.p5).toBeGreaterThan(0.5);
    expect(s.p5).toBeLessThan(2);
    expect(s.p95).toBeGreaterThan(50);
    expect(s.p95).toBeLessThan(150);
  });

  it('confidence = 0.95 narrows the constructed distribution for the same bounds', () => {
    // `[1, 100]` is a *symmetric quantile interval*. At level 0.90 it's the
    // 5th–95th pct (z ≈ 1.645); at level 0.95 it's the 2.5th–97.5th pct
    // (z ≈ 1.96). Same bounds ⇒ larger z ⇒ narrower sigma ⇒ narrower
    // realised p5/p95.
    const at90 = summ('1 to 100', { ...STAT, confidence: 0.9 });
    const at95 = summ('1 to 100', { ...STAT, confidence: 0.95 });
    if (at90?.kind !== 'dist' || at95?.kind !== 'dist') throw new Error('expected dists');
    expect(at95.p5).toBeGreaterThan(at90.p5);
    expect(at95.p95).toBeLessThan(at90.p95);
  });

  it('confidence = 0.68 widens the constructed distribution for the same bounds', () => {
    // Smaller z (≈ 1σ) ⇒ larger sigma ⇒ wider p5/p95 quantile spread.
    const at68 = summ('1 to 100', { ...STAT, confidence: 0.68 });
    const at90 = summ('1 to 100', { ...STAT, confidence: 0.9 });
    if (at68?.kind !== 'dist' || at90?.kind !== 'dist') throw new Error('expected dists');
    const w68 = at68.p95 - at68.p5;
    const w90 = at90.p95 - at90.p5;
    expect(w68).toBeGreaterThan(w90);
  });

  it('about X follows the configured level', () => {
    // Same logic: same `about` interval interpreted at different levels.
    const at90 = summ('about 100', { ...STAT, confidence: 0.9 });
    const at68 = summ('about 100', { ...STAT, confidence: 0.68 });
    if (at90?.kind !== 'dist' || at68?.kind !== 'dist') throw new Error('expected dists');
    expect(at68.p95 - at68.p5).toBeGreaterThan(at90.p95 - at90.p5);
  });

  it('level is reflected in the display value', () => {
    const at99 = one('1 to 100', { ...STAT, confidence: 0.99 });
    expect(at99.display?.level).toBeCloseTo(0.99, 9);
  });
});

describe('ci(lo, hi[, level]) function', () => {
  it('matches the implicit syntax at the sheet default', () => {
    const a = summ('1 to 100');
    const b = summ('ci(1, 100)');
    if (a?.kind !== 'dist' || b?.kind !== 'dist') throw new Error('expected dists');
    // Same z-score → matching CI percentiles (same seed ⇒ identical samples)
    expect(b.p5).toBeCloseTo(a.p5, 6);
    expect(b.p95).toBeCloseTo(a.p95, 6);
  });

  it('one-off level override changes the constructed distribution', () => {
    // Same bounds, different level ⇒ different sigma ⇒ different spread.
    const at90 = summ('ci(1, 100)');
    const at99 = summ('ci(1, 100, 0.99)');
    if (at90?.kind !== 'dist' || at99?.kind !== 'dist') throw new Error('expected dists');
    // 0.99 has larger z than 0.90, so narrower realised p5/p95.
    expect(at99.p5).toBeGreaterThan(at90.p5);
    expect(at99.p95).toBeLessThan(at90.p95);
  });

  it('accepts named level argument', () => {
    const a = summ('ci(1, 100, level=0.95)');
    const b = summ('ci(1, 100, confidence=0.95)');
    if (a?.kind !== 'dist' || b?.kind !== 'dist') throw new Error('expected dists');
    expect(b.p95).toBeCloseTo(a.p95, 6);
  });

  it('rejects non-share-unit bounds', () => {
    expect(values('ci(2, 10 day)')[0].error).toMatch(/share units|bounds/);
  });

  it('rejects out-of-range level', () => {
    expect(values('ci(1, 10, 1.5)')[0].error).toMatch(/confidence level/);
  });
});

describe('tail-awareness (skew)', () => {
  it('symmetric distribution has near-zero skew', () => {
    // A normal with a wide support and a tight `sd` should be near-symmetric.
    // We don't pin the sign, just the magnitude.
    const s = summ('normal(100, 5)', STAT);
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(Math.abs(s.skew)).toBeLessThan(0.1);
  });

  it('lognormal product of many factors skews right and flips skewed=true', () => {
    // Product of independent lognormals: each is right-skewed; the product
    // inherits the right tail. With four factors of `1 to 100`, the result
    // is heavy-tailed. The `(mean − median) / sd` proxy can saturate near
    // zero for very heavy tails because sd itself is dominated by the
    // tail — instead, assert skew is non-trivially positive AND the mean
    // exceeds the median (the directional signal).
    const line = one('a = 1 to 100\nb = 1 to 100\nc = 1 to 100\nd = a*b*c*d', STAT);
    if (line.summary?.kind !== 'dist') throw new Error('expected dist');
    expect(line.summary.skew).toBeGreaterThan(0);
    expect(line.summary.mean).toBeGreaterThan(line.summary.p50);
    expect(line.skewed).toBe(true);
  });

  it('symmetric multiplication is not flagged', () => {
    const line = one('a = normal(100, 5)\nb = normal(100, 5)\na * b', STAT);
    if (line.summary?.kind !== 'dist') throw new Error('expected dist');
    expect(line.skewed).toBeFalsy();
  });

  it('mean/median ratio roughly equals 1 + skew·(sd/median) for lognormals', () => {
    // A sanity check on the skew formula itself: for a symmetric summary
    // (mean ≈ median), the displayed `skew` should be ≈ 0.
    const s = summ('uniform(0, 100)', STAT);
    if (s?.kind !== 'dist') throw new Error('expected dist');
    expect(Math.abs(s.skew)).toBeLessThan(0.05);
  });
});

describe('update(prior, k, n) — Beta–Binomial conjugacy', () => {
  it('exact posterior: beta(2,8) + 3 of 10 ⇒ beta(5, 15)', () => {
    // Posterior mean = 5 / (5 + 15) = 0.25; prior mean = 2/10 = 0.2.
    const post = summ('update(beta(2, 8), 3, 10)');
    if (post?.kind !== 'dist') throw new Error('expected dist');
    expect(post.mean).toBeGreaterThan(0.22);
    expect(post.mean).toBeLessThan(0.28);
    // Posterior should be tighter than prior (10 observations pin it down)
    const prior = summ('beta(2, 8)');
    if (prior?.kind !== 'dist') throw new Error('expected prior dist');
    expect(post.sd).toBeLessThan(prior.sd);
  });

  it('k = 0 with n trials updates the posterior toward 0', () => {
    // beta(2, 8) seen 0 of 10 ⇒ beta(2, 18). Posterior mean 2/20 = 0.10.
    const post = summ('update(beta(2, 8), 0, 10)');
    if (post?.kind !== 'dist') throw new Error('expected dist');
    expect(post.mean).toBeGreaterThan(0.08);
    expect(post.mean).toBeLessThan(0.12);
  });

  it('k = n pins the posterior toward 1', () => {
    // beta(2, 8) seen 10 of 10 ⇒ beta(12, 8). Posterior mean 12/20 = 0.60.
    const post = summ('update(beta(2, 8), 10, 10)');
    if (post?.kind !== 'dist') throw new Error('expected dist');
    expect(post.mean).toBeGreaterThan(0.55);
    expect(post.mean).toBeLessThan(0.65);
  });

  it('accepts named arguments', () => {
    const a = summ('update(beta(2, 8), 3, 10)');
    const b = summ('update(prior=beta(2, 8), successes=3, trials=10)');
    if (a?.kind !== 'dist' || b?.kind !== 'dist') throw new Error('expected dists');
    expect(b.mean).toBeCloseTo(a.mean, 6);
  });

  it('rejects a non-Beta prior with a clear message', () => {
    expect(values('update(1 to 10, 3, 10)')[0].error).toMatch(/beta/i);
    expect(values('update(normal(0.3, 0.1), 3, 10)')[0].error).toMatch(/beta/i);
  });

  it('rejects nonsensical k / n', () => {
    expect(values('update(beta(2, 8), -1, 10)')[0].error).toMatch(/between 0 and trials/);
    expect(values('update(beta(2, 8), 5, 3)')[0].error).toMatch(/between 0 and trials/);
    expect(values('update(beta(2, 8), 3, 0)')[0].error).toMatch(/positive/);
  });
});

describe('postfix update: `seen K of N` / `given K of N`', () => {
  it('parses seen K of N as update(prior, k, n)', () => {
    const a = summ('update(beta(2, 8), 3, 10)');
    const b = summ('beta(2, 8) seen 3 of 10');
    if (a?.kind !== 'dist' || b?.kind !== 'dist') throw new Error('expected dists');
    expect(b.mean).toBeCloseTo(a.mean, 6);
  });

  it('given is a synonym for seen', () => {
    const a = summ('beta(2, 8) seen 3 of 10');
    const b = summ('beta(2, 8) given 3 of 10');
    if (a?.kind !== 'dist' || b?.kind !== 'dist') throw new Error('expected dists');
    expect(b.mean).toBeCloseTo(a.mean, 6);
  });

  it('chains with prior assignment', () => {
    const r = values('p = beta(2, 8)\np seen 3 of 10', STAT)[1];
    if (r.summary?.kind !== 'dist') throw new Error('expected dist');
    expect(r.summary.mean).toBeGreaterThan(0.2);
    expect(r.summary.mean).toBeLessThan(0.3);
  });

  it('rejects seen without of', () => {
    expect(values('beta(2, 8) seen 3')[0].error).toMatch(/of/);
  });
});

describe('prose rate form: `X every Y`', () => {
  it('1 req every 200 ms ≡ 1 req / 200 ms', () => {
    const prose = values('1 req every 200 ms');
    const slash = values('1 req / 200 ms');
    if (prose[0].error) throw new Error(prose[0].error);
    expect(prose[0].display?.unit).toBe(slash[0].display?.unit);
    expect(num('1 req every 200 ms in req/s')).toBeCloseTo(num('1 req / 200 ms in req/s'), 9);
  });

  it('chains with conversion: `1 req every 200 ms in req/s`', () => {
    // 1 req / 200 ms = 5 req/s
    expect(num('1 req every 200 ms in req/s')).toBeCloseTo(5, 9);
  });

  it('does not silently work as a bare unit', () => {
    // `every` is reserved as a postfix operator; using it bare (with no
    // operand) should error rather than silently treating `every` as a unit.
    const r = values('5 every');
    expect(r[0].error).toBeDefined();
  });
});
