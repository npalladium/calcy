import { describe, expect, it } from 'vitest';
import {
  buildExport,
  type CalcyExport,
  EXPORT_VERSION,
  importSummary,
  validateImport
} from '../src/lib/sheet/backup';

const SHEET = {
  id: 'a',
  title: 'Demo',
  body: '1 + 1',
  seed: 42,
  created_at: 100,
  updated_at: 200
};

describe('buildExport', () => {
  it('wraps tables in the versioned envelope with the given timestamp', () => {
    const e = buildExport(
      { sheets: [SHEET], custom_units: { sprint: '2 week' }, settings: { samples: '5000' } },
      '2026-06-26T00:00:00.000Z'
    );
    expect(e.version).toBe(EXPORT_VERSION);
    expect(e.exported_at).toBe('2026-06-26T00:00:00.000Z');
    expect(e.sheets).toHaveLength(1);
    expect(e.custom_units).toEqual({ sprint: '2 week' });
  });

  it('round-trips through validateImport unchanged', () => {
    const e = buildExport(
      { sheets: [SHEET], custom_units: {}, settings: {} },
      '2026-06-26T00:00:00.000Z'
    );
    expect(validateImport(JSON.parse(JSON.stringify(e)))).toEqual(e);
  });
});

describe('validateImport', () => {
  const ok = (over: Partial<CalcyExport> = {}) => ({
    version: EXPORT_VERSION,
    exported_at: '2026-06-26T00:00:00.000Z',
    sheets: [SHEET],
    custom_units: {},
    settings: {},
    ...over
  });

  it('rejects a non-object', () => {
    expect(() => validateImport(null)).toThrow(/backup file/i);
    expect(() => validateImport('nope')).toThrow(/backup file/i);
  });

  it('rejects an unknown version', () => {
    expect(() => validateImport({ ...ok(), version: 2 })).toThrow(/version: 2/);
    expect(() => validateImport({ ...ok(), version: undefined })).toThrow(
      /Unsupported backup version/
    );
  });

  it('rejects a payload with no sheets array', () => {
    expect(() => validateImport({ version: EXPORT_VERSION, sheets: 'x' })).toThrow(
      /missing its sheets/i
    );
  });

  it('drops sheet rows that lack an id, keeping the rest', () => {
    const e = validateImport(
      ok({ sheets: [SHEET, { title: 'no id' }, { id: 'b', body: 'x' }] as never })
    );
    expect(e.sheets.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('defaults missing sheet fields rather than failing', () => {
    const e = validateImport(ok({ sheets: [{ id: 'b' }] as never }));
    expect(e.sheets[0]).toMatchObject({ id: 'b', title: 'Untitled', body: '', seed: 0 });
  });

  it('keeps only string→string entries in the maps', () => {
    const e = validateImport(
      ok({ custom_units: { sprint: '2 week', bad: 5 } as never, settings: 7 as never })
    );
    expect(e.custom_units).toEqual({ sprint: '2 week' });
    expect(e.settings).toEqual({});
  });
});

describe('importSummary', () => {
  it('counts sheets, units, and settings with correct pluralization', () => {
    const e = buildExport(
      { sheets: [SHEET], custom_units: { a: '1', b: '2' }, settings: { x: '1' } },
      ''
    );
    expect(importSummary(e)).toBe('1 sheet, 2 custom units, 1 setting');
  });

  it('omits empty categories', () => {
    const e = buildExport({ sheets: [SHEET, SHEET], custom_units: {}, settings: {} }, '');
    expect(importSummary(e)).toBe('2 sheets');
  });
});
