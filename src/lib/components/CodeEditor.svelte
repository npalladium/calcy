<script lang="ts">
import { onMount, tick } from 'svelte';
import { FUNCTIONS, type LineResult } from '$lib/engine';
import { collectVariables, functionInsertion } from '$lib/editor';

// CodeMirror-backed editor for the calc language: syntax highlighting,
// unit/variable autocomplete, and inline error markers driven by per-line
// engine results. CodeMirror is dynamically imported on mount so it stays out
// of the SSR/prerender path and the initial app shell.
let {
	value = $bindable(),
	lines = [],
	unitNames = [],
	dark = true,
	oncaretline,
	onscrolltop
}: {
	value: string;
	lines?: LineResult[];
	unitNames?: string[];
	// Resolved app theme, passed down so CodeMirror's own dark/light default
	// styling (selection contrast, scrollbar colour-scheme, etc.) tracks the
	// app instead of being hardcoded — the syntax colours themselves are CSS
	// vars and already follow the `html.dark`/`html.light` class.
	dark?: boolean;
	oncaretline?: (line: number) => void;
	onscrolltop?: (top: number) => void;
} = $props();

let host: HTMLDivElement;
// biome-ignore lint/suspicious/noExplicitAny: CodeMirror types are loaded dynamically.
let view: any;
// biome-ignore lint/suspicious/noExplicitAny: CodeMirror lint fn loaded dynamically.
let setDiagnostics: ((state: any, diags: any[]) => any) | null = null;
// biome-ignore lint/suspicious/noExplicitAny: Compartment type loaded dynamically.
let themeCompartment: any;
// biome-ignore lint/suspicious/noExplicitAny: EditorView loaded dynamically; built once and reused by the reconfigure effect below.
let buildTheme: ((isDark: boolean) => any) | null = null;
let ready = $state(false);
// Live refs the editor extensions close over (created once, read repeatedly).
let unitSet = new Set<string>();
$effect(() => {
	unitSet = new Set(unitNames);
});

export async function insertSnippet(snippet: string) {
	if (!view) {
		value = value.trim() ? `${value}\n${snippet}` : snippet;
		return;
	}
	const sel = view.state.selection.main;
	const doc: string = view.state.doc.toString();
	const before = doc.slice(0, sel.from);
	const after = doc.slice(sel.to);
	const lead = before === '' || before.endsWith('\n') ? '' : '\n';
	const trail = after === '' || after.startsWith('\n') ? '' : '\n';
	const text = lead + snippet + trail;
	const at = sel.from + text.length;
	view.dispatch({
		changes: { from: sel.from, to: sel.to, insert: text },
		selection: { anchor: at }
	});
	await tick();
	view.focus();
}

onMount(() => {
	let destroyed = false;
	(async () => {
		const [{ EditorView, keymap, lineNumbers, drawSelection }, { EditorState, Compartment }, commands, { autocompletion, completionKeymap }, { StreamLanguage, syntaxHighlighting, HighlightStyle }, { tags: t }, lint] =
			await Promise.all([
				import('@codemirror/view'),
				import('@codemirror/state'),
				import('@codemirror/commands'),
				import('@codemirror/autocomplete'),
				import('@codemirror/language'),
				import('@lezer/highlight'),
				import('@codemirror/lint')
			]);
		if (destroyed) return;
		setDiagnostics = lint.setDiagnostics;

		const calc = StreamLanguage.define({
			token(stream) {
				if (stream.eatSpace()) return null;
				if (stream.match(/#.*/)) return 'co';
				if (stream.match(/\b(?:to|in|unit)\b/)) return 'kw';
				if (stream.match(/[0-9][0-9_]*(?:\.[0-9_]+)?(?:[eE][+-]?[0-9]+)?/)) return 'num';
				if (stream.match(/[A-Za-z_]\w*/)) {
					const w = stream.current();
					if (unitSet.has(w)) return 'unit';
					return stream.peek() === '(' ? 'fn' : 'var';
				}
				if (stream.match(/[+\-*/^=]|×|÷/)) return 'op';
				stream.next();
				return null;
			},
			tokenTable: {
				co: t.lineComment,
				kw: t.keyword,
				num: t.number,
				op: t.operator,
				unit: t.typeName,
				fn: t.function(t.variableName),
				var: t.variableName
			},
			// Tells toggleLineComment which token to insert/strip (see keymap below).
			languageData: { commentTokens: { line: '#' } }
		});

		const highlight = HighlightStyle.define([
			{ tag: t.lineComment, color: 'var(--text-faint)', fontStyle: 'italic' },
			{ tag: t.keyword, color: 'var(--c-dist)' },
			{ tag: t.number, color: 'var(--c-value)' },
			{ tag: t.operator, color: 'var(--c-rate)' },
			{ tag: t.typeName, color: 'var(--warm)' },
			{ tag: t.function(t.variableName), color: 'var(--c-rate)' },
			{ tag: t.variableName, color: 'var(--text)' }
		]);

		// biome-ignore lint/suspicious/noExplicitAny: CompletionContext from dynamic import.
		const complete = (ctx: any) => {
			const w = ctx.matchBefore(/[A-Za-z_]\w*/);
			if (!w || (w.from === w.to && !ctx.explicit)) return null;
			const vars = collectVariables(ctx.state.doc.toString());
			// Insert `name(` and land the cursor inside the parens rather than
			// the bare label, so picking a function drops the user straight into
			// its argument list.
			// biome-ignore lint/suspicious/noExplicitAny: Completion/view types from dynamic import.
			const applyFunction = (name: string) => (view: any, _completion: any, from: number, to: number) => {
				const { insert, cursorOffset } = functionInsertion(name);
				view.dispatch({
					changes: { from, to, insert },
					selection: { anchor: from + cursorOffset }
				});
			};
			const options = [
				...['to', 'in', 'unit'].map((label) => ({ label, type: 'keyword' })),
				...vars.map((label) => ({ label, type: 'variable' })),
				...unitNames.map((label) => ({ label, type: 'type', boost: -1 })),
				...FUNCTIONS.map((f) => ({
					label: f.name,
					type: 'function',
					detail: f.sig,
					info: f.summary,
					apply: applyFunction(f.name)
				}))
			];
			return { from: w.from, options, validFor: /^[A-Za-z_]\w*$/ };
		};

		// The colours themselves are all CSS vars that already follow the
		// html.dark/html.light class, so `isDark` only affects CodeMirror's own
		// theme metadata (EditorView.darkTheme facet — scrollbar colour-scheme,
		// contrast defaults for extensions that consult it). Rebuilt and
		// reconfigured through a Compartment whenever `dark` changes, so the
		// editor never has to be torn down and re-created.
		buildTheme = (isDark: boolean) =>
			EditorView.theme(
				{
					'&': { color: 'var(--text)', backgroundColor: 'transparent', height: '100%' },
					'.cm-content': {
						fontFamily: 'var(--font-mono)',
						fontSize: '14px',
						lineHeight: '22px',
						padding: '10px 0',
						caretColor: 'var(--text)'
					},
					'.cm-line': { padding: '0 12px' },
					'.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono)' },
					'&.cm-focused': { outline: 'none' },
					'.cm-cursor': { borderLeftColor: 'var(--text)' },
					'.cm-selectionBackground, ::selection': { backgroundColor: 'var(--surface-3)' },
					'&.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--surface-3)' },
					'.cm-lint-marker': { width: '0.8em' }
				},
				{ dark: isDark }
			);
		themeCompartment = new Compartment();

		// defaultKeymap already binds Mod-/ to toggleComment, but ⌘/ is the
		// global Help shortcut (see $lib/sheet/keymap.ts) — drop that one entry
		// and rebind comment-toggle to Mod-Shift-/ so the two don't collide.
		// defaultKeymap's Alt-ArrowUp/Down (moveLineUp/moveLineDown) and
		// Shift-Alt-ArrowUp/Down (copyLineUp/copyLineDown, i.e. duplicate line)
		// bindings are kept as-is.
		const lineKeymap = [
			...commands.defaultKeymap.filter((b: { key?: string }) => b.key !== 'Mod-/'),
			{ key: 'Mod-Shift-/', run: commands.toggleLineComment }
		];

		const state = EditorState.create({
			doc: value,
			extensions: [
				lineNumbers(),
				drawSelection(),
				commands.history(),
				keymap.of([...lineKeymap, ...commands.historyKeymap, ...completionKeymap]),
				calc,
				syntaxHighlighting(highlight),
				autocompletion({ override: [complete] }),
				lint.lintGutter(),
				themeCompartment.of(buildTheme(dark)),
				EditorView.updateListener.of((u) => {
					if (u.docChanged) value = u.state.doc.toString();
					if (u.selectionSet || u.docChanged) {
						const head = u.state.selection.main.head;
						oncaretline?.(u.state.doc.lineAt(head).number - 1);
					}
				})
			]
		});

		view = new EditorView({ state, parent: host });
		view.scrollDOM.addEventListener('scroll', () => onscrolltop?.(view.scrollDOM.scrollTop));
		ready = true;
	})();

	return () => {
		destroyed = true;
		view?.destroy();
	};
});

// Push external value changes (load sheet, insert, tape→notepad) into the view.
// Read `value` first so the effect always tracks it as a dependency — if we let
// `view &&` short-circuit on the first run (the CodeMirror view mounts via an
// async import, so it's briefly undefined), `value` would never be tracked and
// a sheet loaded from the URL hash / DB would never reach the editor.
$effect(() => {
	const next = value;
	if (view && next !== view.state.doc.toString()) {
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
	}
});

// Reconfigure CodeMirror's own theme metadata when the resolved app theme
// flips (explicit pick or a live prefers-color-scheme change).
$effect(() => {
	const isDark = dark;
	if (view && themeCompartment && buildTheme) {
		view.dispatch({ effects: themeCompartment.reconfigure(buildTheme(isDark)) });
	}
});

// Reflect engine errors as inline diagnostics whenever results change.
$effect(() => {
	void lines;
	if (!view || !setDiagnostics) return;
	const doc = view.state.doc;
	const diags = lines
		.filter((l) => l.error)
		.map((l) => {
			const ln = doc.line(Math.min(l.index + 1, doc.lines));
			return { from: ln.from, to: ln.to, severity: 'error', message: l.error as string };
		});
	view.dispatch(setDiagnostics(view.state, diags));
});
</script>

<div class="cm-host" bind:this={host}></div>
{#if !ready}
	<div class="loading" aria-hidden="true"></div>
{/if}

<style>
	.cm-host {
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}
	.cm-host :global(.cm-editor) {
		height: 100%;
	}
	.cm-host :global(.cm-gutters) {
		background: var(--surface-1);
		border-right: 1px solid var(--surface-2);
		color: var(--text-faint);
	}
	.loading {
		display: none;
	}
</style>
