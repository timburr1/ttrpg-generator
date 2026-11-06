import type { Tavern } from './tavern';
import { elementMake } from './ui';

function cardRender(result: HTMLElement, tavern: Tavern): void {
  const card = elementMake('article', undefined, 'card');
  card.append(
    elementMake('h2', tavern.name),
    elementMake('p', `Innkeeper: ${tavern.innkeeper}`),
    elementMake('p', `Room tonight: ${tavern.room}`),
    elementMake('p', `Odd feature: ${tavern.feature}`),
  );
  result.replaceChildren(card);
}

export function uiPaneTavern(generate: () => Tavern): HTMLElement {
  const button = elementMake('button', 'Generate');
  button.type = 'button';
  const result = elementMake('div', undefined, 'result');
  result.setAttribute('aria-live', 'polite');

  button.addEventListener('click', () => {
    cardRender(result, generate());
  });

  const controls = elementMake('div', undefined, 'controls');
  controls.append(button);
  const pane = elementMake('div');
  pane.append(controls, result);
  return pane;
}
