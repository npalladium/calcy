import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Dimension, dimDiv, dimEq, dimMul, dimPow } from '../src/lib/engine/value';
import { evalSrc, makeEngine } from './helpers';

// Type-soundness and robustness of the engine, framed as a type system whose
// "types" are physical dimensions.
//
//   PRESERVATION — for a well-typed (dimension-correct) expression, the dim of
//     the evaluated Value equals the dim computed structurally from the AST.
//     The existing suite asserts this only by side-effect (display strings);
//     here it's asserted directly over thousands of generated expressions.
//
//   PROGRESS — evaluation of any well-typed expression yields a real Value
//     (a finite scalar here, since the generator uses finite atoms), never
//     "stuck" (undefined, a thrown TypeError, a silent NaN).
//
//   TOTALITY / ROBUSTNESS — for ARBITRARY input (random Unicode, operator
//     soup, pathological nesting) the engine never crashes the process: it
//     either returns a Value or a typed error string. A recursive-descent
//     parser that stack-overflows, or an evaluator that throws a non-Error,
//     would be caught here.

// ---- a generator of dimension-typed expressions ----

interface Term {
	src: string;
	dim: Dimension;
}

// Atoms with known dimensions and small magnitudes (so deep trees stay finite).
const ATOMS: Term[] = [
	{ src: '1', dim: {} },
	{ src: '2', dim: {} },
	{ src: '2 m', dim: { length: 1 } },
	{ src: '3 s', dim: { time: 1 } },
	{ src: '2 kg', dim: { mass: 1 } }
];

function genTerm(depth: number): fc.Arbitrary<Term> {
	const atom = fc.constantFrom(...ATOMS);
	if (depth <= 0) return atom;
	const sub = () => genTerm(depth - 1);
	return fc.oneof(
		{ weight: 1, arbitrary: atom },
		// product / quotient compose dimensions multiplicatively
		{
			weight: 2,
			arbitrary: fc.tuple(sub(), sub()).map(([a, b]) => ({
				src: `(${a.src} * ${b.src})`,
				dim: dimMul(a.dim, b.dim)
			}))
		},
		{
			weight: 2,
			arbitrary: fc.tuple(sub(), sub()).map(([a, b]) => ({
				src: `(${a.src} / ${b.src})`,
				dim: dimDiv(a.dim, b.dim)
			}))
		},
		// integer power scales the dimension
		{
			weight: 1,
			arbitrary: fc.tuple(sub(), fc.integer({ min: 0, max: 3 })).map(([a, n]) => ({
				src: `(${a.src})^${n}`,
				dim: dimPow(a.dim, n)
			}))
		},
		// addition of a term with itself: guaranteed dimension-matched, so it
		// exercises the +-path without tripping the incompatible-dimension guard
		{
			weight: 1,
			arbitrary: sub().map((a) => ({ src: `(${a.src} + ${a.src})`, dim: a.dim }))
		}
	);
}

describe('type soundness over generated dimension-typed expressions', () => {
	it('preservation: evaluated dim equals the structurally-computed dim', () => {
		fc.assert(
			fc.property(genTerm(4), ({ src, dim }) => {
				const v = evalSrc(src);
				expect(
					dimEq(v.dim, dim),
					`${src}: got ${JSON.stringify(v.dim)}, want ${JSON.stringify(dim)}`
				).toBe(true);
			}),
			{ numRuns: 400 }
		);
	});

	it('progress: a well-typed expression evaluates to a finite scalar (never stuck)', () => {
		fc.assert(
			fc.property(genTerm(4), ({ src }) => {
				const v = evalSrc(src);
				// All atoms are deterministic, so the result stays on the scalar path.
				expect(v.samples, `${src} unexpectedly produced samples`).toBeUndefined();
				expect(Number.isFinite(v.scalar), `${src} -> ${v.scalar}`).toBe(true);
			}),
			{ numRuns: 400 }
		);
	});

	it('dropped zero exponents: m·m / (m·m) is exactly dimensionless', () => {
		const v = evalSrc('(2 m * 3 m) / (4 m * 5 m)');
		expect(v.dim).toEqual({}); // not { length: 0 }
	});
});

// ---- robustness: the engine is total on arbitrary input ----

describe('robustness: evalSheet never crashes on arbitrary input', () => {
	it('arbitrary Unicode strings yield a Value or a typed error, never a throw', () => {
		fc.assert(
			fc.property(fc.string({ unit: 'grapheme', maxLength: 40 }), (s) => {
				const engine = makeEngine();
				let result: ReturnType<typeof engine.evalSheet> | undefined;
				expect(
					() => {
						result = engine.evalSheet(s);
					},
					`threw on input ${JSON.stringify(s)}`
				).not.toThrow();
				for (const l of result?.lines ?? []) {
					// Every result line is well-formed: either it has a display, or a
					// string error message, or it's structural (blank/comment).
					const ok =
						l.kind === 'blank' ||
						l.kind === 'comment' ||
						l.display !== undefined ||
						typeof l.error === 'string';
					expect(ok, `malformed line for ${JSON.stringify(s)}: ${JSON.stringify(l)}`).toBe(true);
				}
			}),
			{ numRuns: 300 }
		);
	});

	it('operator/keyword soup never throws', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.constantFrom('+', '-', '*', '/', '^', '(', ')', 'to', 'in', '5', 'm', '%', '±', '|>'),
					{
						maxLength: 12
					}
				),
				(toks) => {
					const engine = makeEngine();
					expect(() => engine.evalSheet(toks.join(' '))).not.toThrow();
				}
			),
			{ numRuns: 300 }
		);
	});

	it('deeply nested parentheses do not overflow the parser stack', () => {
		const depth = 5000;
		const src = `${'('.repeat(depth)}1${')'.repeat(depth)}`;
		const engine = makeEngine();
		let res: ReturnType<typeof engine.evalSheet> | undefined;
		expect(() => {
			res = engine.evalSheet(src);
		}).not.toThrow();
		const line = res?.lines[0];
		// Either it parsed (1) or it reported a typed error — but it did not crash.
		expect(line?.display !== undefined || typeof line?.error === 'string').toBe(true);
	});

	it('a parse/eval failure on one line never poisons the others', () => {
		const lines = makeEngine().evalSheet('5 km + 3 s\n2 + 2\n@@@garbage@@@\n10 m in ft').lines;
		expect(lines[0].error).toBeTruthy(); // incompatible dims
		expect(lines[1].display?.value).toBe('4'); // unaffected
		expect(lines[2].error).toBeTruthy(); // garbage
		expect(lines[3].display).toBeTruthy(); // unaffected
	});
});
