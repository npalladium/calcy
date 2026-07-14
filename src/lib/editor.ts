// Pure helpers for the code editor (highlighting / autocomplete / lint). Kept
// out of the Svelte component so they are unit-testable without a DOM.

// Names the user has bound in the sheet — either `name = expr` or
// `unit name = expr`. Comments (after `#`) are ignored. Order of first
// definition is preserved; redefinitions are deduped.
export function collectVariables(text: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of text.split('\n')) {
		const line = raw.split('#', 1)[0];
		const m = /^\s*(?:unit\s+)?([A-Za-z_]\w*)\s*=(?!=)/.exec(line);
		if (m && !seen.has(m[1])) {
			seen.add(m[1]);
			out.push(m[1]);
		}
	}
	return out;
}

// Pin (or clear) the output unit of a single sheet line by rewriting its
// trailing `in`/`to` conversion — the sheet text stays the source of truth.
// A trailing comment is preserved. An empty unit removes the conversion.
export function setLineConversion(line: string, unit: string): string {
	const hash = line.indexOf('#');
	const code = (hash >= 0 ? line.slice(0, hash) : line).trimEnd();
	const comment = hash >= 0 ? line.slice(hash).trim() : '';
	const core = code.replace(/\s+(?:in|to)\s+.+$/, '');
	const u = unit.trim();
	const rebuilt = u ? `${core} in ${u}` : core;
	return comment ? `${rebuilt} ${comment}` : rebuilt;
}
