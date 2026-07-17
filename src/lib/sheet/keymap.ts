// Pure mapping from a keyboard event to an app intent. Keeps the keyboard
// shortcut table testable and free of DOM / app-state coupling; the shell
// decides what each intent does (and whether to preventDefault).

export type KeyIntent =
  | { type: 'close' }
  | { type: 'toggle-sheets' }
  | { type: 'toggle-help' }
  | { type: 'toggle-debug' }
  | { type: 'reroll' };

export interface KeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}

// `Escape` always closes panels (no modifier). Everything else needs ⌘/Ctrl.
export function keyToIntent(e: KeyEventLike): KeyIntent | null {
  if (e.key === 'Escape') return { type: 'close' };
  if (!(e.metaKey || e.ctrlKey)) return null;
  switch (e.key) {
    case 'k':
      return { type: 'toggle-sheets' };
    case '/':
      return { type: 'toggle-help' };
    case 'd':
    case 'D':
      return { type: 'toggle-debug' };
    case 'Enter':
      return { type: 'reroll' };
    default:
      return null;
  }
}
