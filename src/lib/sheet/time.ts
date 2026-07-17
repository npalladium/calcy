// Pure relative-time formatting. `now` is a parameter (not Date.now()) so it
// is deterministic and unit-testable; callers pass the current time.
export function relativeTime(ms: number, now: number): string {
  // `ms` is normally in the past, but clock skew (or a freshly-saved row whose
  // timestamp leads `now`) can make it the future. Work off the magnitude and
  // flip the phrasing rather than collapsing every future time to "just now"
  // or printing a negative count.
  const future = ms > now;
  const diff = Math.abs(now - ms);
  const m = Math.round(diff / 60000);
  const phrase = (n: number, unit: string) => (future ? `in ${n}${unit}` : `${n}${unit} ago`);
  if (m < 1) return 'just now';
  if (m < 60) return phrase(m, 'm');
  const h = Math.round(m / 60);
  if (h < 24) return phrase(h, 'h');
  const d = Math.round(h / 24);
  return phrase(d, 'd');
}
