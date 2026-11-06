import { describe, expect, it } from 'vitest';
import { uiPaneFind } from './ui';

describe('uiPaneFind', () => {
  const panes: readonly [{ id: string }, ...{ id: string }[]] = [{ id: 'alpha' }, { id: 'beta' }];

  it('finds the pane a hash names', () => {
    expect(uiPaneFind('#beta', panes)).toBe(panes[1]);
    expect(uiPaneFind('#alpha', panes)).toBe(panes[0]);
  });

  it('falls back to the first pane for an empty, unknown, malformed, or differently cased hash', () => {
    for (const hash of ['', '#', '#gamma', '#%', '#%E0', '#pane-beta', '#BETA', 'beta']) {
      expect(uiPaneFind(hash, panes)).toBe(panes[0]);
    }
  });
});
