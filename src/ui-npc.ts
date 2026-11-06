import { GENDERS, type Gender, type Npc, type NpcRequest, RACES, type Race } from './npc';
import { elementMake } from './ui';

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

export function uiPaneNpc(generate: (request: NpcRequest) => Npc): HTMLElement {
  const race = selectField(
    'npc-race',
    'Race',
    RACES.map((value) => [value, RACE_LABELS[value]]),
  );
  const gender = selectField(
    'npc-gender',
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
  const pane = elementMake('div');
  pane.append(controls, result);
  return pane;
}
