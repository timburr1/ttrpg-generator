const TITLE = 'TTRPG Generator';

export type UiPane = { readonly id: string; readonly label: string; readonly element: HTMLElement };

export function elementMake<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) {
    element.textContent = text;
  }
  if (className !== undefined) {
    element.className = className;
  }
  return element;
}

// The pane a hash such as "#tavern" names, or the first pane when the hash is empty or names none. The hash is compared as written: pane ids are plain ASCII, and decoding would throw on a malformed hash.
export function uiPaneFind<T extends { readonly id: string }>(hash: string, panes: readonly [T, ...T[]]): T {
  return panes.find((pane) => `#${pane.id}` === hash) ?? panes[0];
}

// Links only change the hash, so back/forward and deep links share one code path.
export function uiMount(root: HTMLElement, panes: readonly [UiPane, ...UiPane[]]): void {
  const nav = elementMake('nav', undefined, 'panes');
  nav.setAttribute('aria-label', 'Generators');
  const shown = panes.map((pane) => {
    const link = elementMake('a', pane.label);
    link.href = `#${pane.id}`;
    // Not the hash target itself, or the browser would scroll to the panel.
    const panel = elementMake('div');
    panel.id = `pane-${pane.id}`;
    panel.append(pane.element);
    nav.append(link);
    return { pane, link, panel };
  });

  function paneActivate(): void {
    const active = uiPaneFind(window.location.hash, panes);
    for (const { pane, link, panel } of shown) {
      panel.hidden = pane !== active;
      if (pane === active) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  window.addEventListener('hashchange', paneActivate);
  root.replaceChildren(elementMake('h1', TITLE), nav, ...shown.map(({ panel }) => panel));
  paneActivate();
}

export function uiErrorShow(root: HTMLElement, problems: readonly string[]): void {
  const panel = elementMake('section', undefined, 'error');
  panel.setAttribute('role', 'alert');
  const list = elementMake('ul');
  for (const problem of problems) {
    list.append(elementMake('li', problem));
  }
  panel.append(elementMake('h2', 'Content files need fixing'), list);
  root.replaceChildren(elementMake('h1', TITLE), panel);
}
