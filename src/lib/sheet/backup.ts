// Pure (de)serialization for the versioned JSON backup — a portable export of
// sheets + custom units + settings, separate from the byte-exact `.sqlite`
// dump. No I/O: the shell (SheetController) reads rows from the DB worker,
// wraps them with buildExport(), and validates incoming files with
// validateImport() before handing the normalized data back to the worker to
// merge.
//
// `version` gates compatibility: an import whose version we don't understand is
// rejected rather than half-applied. Bump EXPORT_VERSION (and handle older
// payloads in validateImport) whenever the shape changes.

export const EXPORT_VERSION = 1;

export interface SheetBackup {
	id: string;
	title: string;
	body: string;
	seed: number;
	created_at: number;
	updated_at: number;
}

// The three tables a JSON backup carries, as returned by the DB worker.
export interface ExportPayload {
	sheets: SheetBackup[];
	custom_units: Record<string, string>;
	settings: Record<string, string>;
}

export interface CalcyExport extends ExportPayload {
	version: number;
	exported_at: string; // ISO timestamp, stamped by the shell
}

// Wrap freshly-read tables in the versioned envelope. `exportedAt` is passed in
// (not read from a clock) to keep this pure and deterministic for tests.
export function buildExport(payload: ExportPayload, exportedAt: string): CalcyExport {
	return { version: EXPORT_VERSION, exported_at: exportedAt, ...payload };
}

function asString(v: unknown, fallback = ''): string {
	return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
	return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

// A backup row is only usable if it has an id; everything else gets a sane
// default so a slightly-old or hand-edited file still imports what it can.
function normalizeSheet(raw: unknown): SheetBackup | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const o = raw as Record<string, unknown>;
	if (typeof o.id !== 'string' || o.id === '') return null;
	return {
		id: o.id,
		title: asString(o.title, 'Untitled'),
		body: asString(o.body),
		seed: asNumber(o.seed),
		created_at: asNumber(o.created_at),
		updated_at: asNumber(o.updated_at)
	};
}

// Keep only string→string entries; anything else (a corrupted map) becomes {}.
function normalizeStringMap(raw: unknown): Record<string, string> {
	if (typeof raw !== 'object' || raw === null) return {};
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		if (typeof v === 'string') out[k] = v;
	}
	return out;
}

// Validate + normalize a parsed JSON file into a CalcyExport, throwing a
// user-facing message on anything we can't safely import.
export function validateImport(parsed: unknown): CalcyExport {
	if (typeof parsed !== 'object' || parsed === null)
		throw new Error("That doesn't look like a calcy backup file.");
	const o = parsed as Record<string, unknown>;
	if (o.version !== EXPORT_VERSION)
		throw new Error(
			`Unsupported backup version: ${String(o.version)}. This calcy reads version ${EXPORT_VERSION}.`
		);
	if (!Array.isArray(o.sheets)) throw new Error('This backup is missing its sheets.');
	return {
		version: EXPORT_VERSION,
		exported_at: asString(o.exported_at),
		sheets: o.sheets.map(normalizeSheet).filter((s): s is SheetBackup => s !== null),
		custom_units: normalizeStringMap(o.custom_units),
		settings: normalizeStringMap(o.settings)
	};
}

// A short "x sheets, y custom units, z settings" line for post-import feedback.
export function importSummary(e: CalcyExport): string {
	const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
	const parts = [plural(e.sheets.length, 'sheet')];
	const u = Object.keys(e.custom_units).length;
	if (u) parts.push(plural(u, 'custom unit'));
	const s = Object.keys(e.settings).length;
	if (s) parts.push(plural(s, 'setting'));
	return parts.join(', ');
}
