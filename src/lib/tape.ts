// Tape mode compiles its op rows to the *same* expression language the engine
// evaluates — there is no second evaluator. Each row is `op operand`; the tape
// is the left-associative fold of those rows. Kept pure and framework-agnostic
// so it is unit-testable in isolation.

export type TapeOp = '=' | '+' | '-' | '*' | '/';

export interface TapeRow {
	op: TapeOp;
	operand: string;
}

// A blank operand evaluates as 0 so a half-typed tape never throws.
const operand = (r: TapeRow): string => `(${r.operand.trim() || '0'})`;

// The left-associative prefix expression up to (and including) row `upto`.
export function tapePrefix(rows: TapeRow[], upto: number): string {
	let e = operand(rows[0]);
	for (let k = 1; k <= upto; k++) e = `(${e} ${rows[k].op} ${operand(rows[k])})`;
	return e;
}

// One prefix line per row, so the engine yields the running value at each step.
export function tapeSheet(rows: TapeRow[]): string {
	return rows.map((_, i) => tapePrefix(rows, i)).join('\n');
}
