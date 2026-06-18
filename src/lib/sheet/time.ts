// Pure relative-time formatting. `now` is a parameter (not Date.now()) so it
// is deterministic and unit-testable; callers pass the current time.
export function relativeTime(ms: number, now: number): string {
	const diff = now - ms;
	const m = Math.round(diff / 60000);
	if (m < 1) return 'just now';
	if (m < 60) return `${m}m ago`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.round(h / 24);
	return `${d}d ago`;
}
