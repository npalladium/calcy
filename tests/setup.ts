import fc from 'fast-check';

// Deterministic, bounded property runs: stable in CI and fast.
fc.configureGlobal({ numRuns: 60, seed: 0xc0ffee });
