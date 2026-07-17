import { describe, expect, it } from 'vitest';
import { keyToIntent } from '../src/lib/sheet/keymap';

const ev = (key: string, mod = false) => ({ key, metaKey: mod, ctrlKey: false });

describe('keyToIntent', () => {
  it('maps Escape to close regardless of modifier', () => {
    expect(keyToIntent(ev('Escape'))).toEqual({ type: 'close' });
    expect(keyToIntent(ev('Escape', true))).toEqual({ type: 'close' });
  });
  it('requires a modifier for the command shortcuts', () => {
    expect(keyToIntent(ev('k'))).toBeNull();
    expect(keyToIntent(ev('/'))).toBeNull();
    expect(keyToIntent(ev('Enter'))).toBeNull();
  });
  it('maps ⌘K/⌘//⌘D/⌘Enter to their intents', () => {
    expect(keyToIntent(ev('k', true))).toEqual({ type: 'toggle-sheets' });
    expect(keyToIntent(ev('/', true))).toEqual({ type: 'toggle-help' });
    expect(keyToIntent(ev('d', true))).toEqual({ type: 'toggle-debug' });
    expect(keyToIntent(ev('D', true))).toEqual({ type: 'toggle-debug' });
    expect(keyToIntent(ev('Enter', true))).toEqual({ type: 'reroll' });
  });
  it('honors Ctrl as well as Meta', () => {
    expect(keyToIntent({ key: 'k', metaKey: false, ctrlKey: true })).toEqual({
      type: 'toggle-sheets'
    });
  });
  it('returns null for unmapped modified keys', () => {
    expect(keyToIntent(ev('x', true))).toBeNull();
  });
});
