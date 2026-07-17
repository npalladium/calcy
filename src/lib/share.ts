// URL-hash sharing: pack a sheet into the URL fragment so
// it can be shared without a server. The fragment never leaves the client.

export interface SharePayload {
  title: string;
  body: string;
  seed: number;
}

// JSON → URI-escaped (for unicode) → base64. Kept in the fragment, so size is
// not a concern for ordinary sheets.
export function encodeShare(p: SharePayload): string {
  return btoa(encodeURIComponent(JSON.stringify({ title: p.title, body: p.body, seed: p.seed })));
}

export function decodeShare(s: string): SharePayload | null {
  if (!s) return null;
  try {
    const o = JSON.parse(decodeURIComponent(atob(s)));
    if (
      typeof o?.title === 'string' &&
      typeof o?.body === 'string' &&
      typeof o?.seed === 'number' &&
      Number.isFinite(o.seed)
    )
      // Normalise line endings (a sheet authored on Windows or pasted from a
      // CRLF source) and coerce the seed to an integer so the recipient's RNG
      // draws the same sequence the sharer saw.
      return { title: o.title, body: o.body.replace(/\r\n/g, '\n'), seed: Math.trunc(o.seed) };
    return null;
  } catch {
    return null;
  }
}
