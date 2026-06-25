// Regenerates the auto-generated "Catalogue" section of the Reference doc in
// place, between the sentinel markers. Run via `pnpm gen:reference`; also runs in
// `prebuild` so a build always ships a catalogue matching the engine. The
// freshness guard (tests/reference-catalogue.test.ts) fails CI if a commit left
// the region stale.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BEGIN_MARKER, END_MARKER, renderCatalogue } from './reference-catalogue';

const DOC = fileURLToPath(new URL('../src/lib/docs/reference.md', import.meta.url));

const src = readFileSync(DOC, 'utf8');
const start = src.indexOf(BEGIN_MARKER);
const end = src.indexOf(END_MARKER);
if (start === -1 || end === -1) {
	throw new Error(`gen-reference: markers not found in ${DOC}`);
}
const next = src.slice(0, start) + renderCatalogue() + src.slice(end + END_MARKER.length);
if (next !== src) {
	writeFileSync(DOC, next);
	console.log('gen-reference: updated reference.md catalogue');
} else {
	console.log('gen-reference: catalogue already up to date');
}
