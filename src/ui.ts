import { GENDERS, type Gender, type Npc, type NpcRequest, RACES, type Race } from './npc';

const RACE_LABELS: Readonly<Record<Race, string>> = {
  dwarf: 'Dwarf',
  elf: 'Elf',
  gnome: 'Gnome',
  halfling: 'Halfling',
  'half-elf': 'Half-elf',
  'half-orc': 'Half-orc',
  human: 'Human',
  warforged: 'Warforged',
};

const GENDER_LABELS: Readonly<Record<Gender, string>> = { male: 'Male', female: 'Female', other: 'Other / NB' };

const GENDER_CARD_LABELS: Readonly<Record<Gender, string>> = { male: 'male', female: 'female', other: 'other / NB' };

function elementMake<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) {
    element.textContent = text;
  }
  if (className !== undefined) {
    element.className = className;
  }
  return element;
}

function selectField(id: string, labelText: string, choices: readonly (readonly [string, string])[]): { field: HTMLElement; select: HTMLSelectElement } {
  const field = elementMake('div', undefined, 'field');
  const label = elementMake('label', labelText);
  label.htmlFor = id;
  const select = elementMake('select');
  select.id = id;
  for (const [value, text] of [['random', 'Random'], ...choices]) {
    const option = elementMake('option', text);
    option.value = value;
    select.append(option);
  }
  field.append(label, select);
  return { field, select };
}

// The options are built from the allowed values, so anything else is a bug.
function selectRead<T extends string>(select: HTMLSelectElement, allowed: readonly T[]): T | 'random' {
  const found = allowed.find((value) => value === select.value);
  if (found !== undefined) {
    return found;
  }
  if (select.value === 'random') {
    return 'random';
  }
  throw new Error(`select #${select.id} has unexpected value "${select.value}"`);
}

function cardRender(result: HTMLElement, npc: Npc): void {
  const name = npc.lastName === undefined ? npc.firstName : `${npc.firstName} ${npc.lastName}`;
  const card = elementMake('article', undefined, 'card');
  card.append(
    elementMake('h2', name),
    elementMake('p', `${RACE_LABELS[npc.race]}, ${GENDER_CARD_LABELS[npc.gender]}`, 'meta'),
    elementMake('p', `Quirk: ${npc.quirk}`),
  );
  result.replaceChildren(card);
}

export function uiMount(root: HTMLElement, generate: (request: NpcRequest) => Npc): void {
  const race = selectField(
    'race',
    'Race',
    RACES.map((value) => [value, RACE_LABELS[value]]),
  );
  const gender = selectField(
    'gender',
    'Gender',
    GENDERS.map((value) => [value, GENDER_LABELS[value]]),
  );
  const button = elementMake('button', 'Generate');
  button.type = 'button';
  const result = elementMake('div', undefined, 'result');
  result.setAttribute('aria-live', 'polite');

  button.addEventListener('click', () => {
    cardRender(result, generate({ race: selectRead(race.select, RACES), gender: selectRead(gender.select, GENDERS) }));
  });

  const controls = elementMake('div', undefined, 'controls');
  controls.append(race.field, gender.field, button);
  root.replaceChildren(elementMake('h1', 'NPC Generator'), controls, result);
}

export function uiErrorShow(root: HTMLElement, problems: readonly string[]): void {
  const panel = elementMake('section', undefined, 'error');
  panel.setAttribute('role', 'alert');
  const list = elementMake('ul');
  for (const problem of problems) {
    list.append(elementMake('li', problem));
  }
  panel.append(elementMake('h2', 'Content files need fixing'), list);
  root.replaceChildren(elementMake('h1', 'NPC Generator'), panel);
}
