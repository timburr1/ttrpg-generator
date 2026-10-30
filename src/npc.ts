export const RACES = ['dwarf', 'elf', 'gnome', 'halfling', 'half-elf', 'half-orc', 'human', 'warforged'] as const;
export type Race = (typeof RACES)[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_WEIGHTS: Readonly<Record<Gender, number>> = { male: 46, female: 46, other: 8 };

// How each race forms a surname. 'list' draws from data/names/<race>/last.md; 'patronymic' takes another first name from the NPC's own pool and appends the suffix for the NPC's gender.
export type LastNameRule =
  | { readonly kind: 'list' }
  | { readonly kind: 'none' }
  | { readonly kind: 'patronymic'; readonly suffix: Readonly<Record<Gender, string>> };

export const LAST_NAME_RULES: Readonly<Record<Race, LastNameRule>> = {
  dwarf: { kind: 'patronymic', suffix: { male: 'sen', female: 'dottir', other: 'kind' } },
  warforged: { kind: 'none' },
  elf: { kind: 'list' },
  gnome: { kind: 'list' },
  halfling: { kind: 'list' },
  'half-elf': { kind: 'list' },
  'half-orc': { kind: 'list' },
  human: { kind: 'list' },
};

// A race's rule joined with its data.
export type LastNameSource =
  | { readonly kind: 'list'; readonly entries: readonly string[] }
  | { readonly kind: 'none' }
  | { readonly kind: 'patronymic'; readonly suffix: Readonly<Record<Gender, string>> };

export type NpcData = {
  readonly namesFirst: Readonly<Record<Race, Readonly<Record<Gender, readonly string[]>>>>;
  readonly namesLast: Readonly<Record<Race, LastNameSource>>;
  readonly quirks: readonly string[];
};

// Uniform in [0, 1), the Math.random contract.
export type Rng = () => number;

export type NpcRequest = { readonly race: Race | 'random'; readonly gender: Gender | 'random' };

export type Npc = {
  readonly race: Race;
  readonly gender: Gender;
  readonly firstName: string;
  readonly lastName: string | undefined; // undefined for races with a single name
  readonly quirk: string;
};

export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) {
    throw new Error(`rngPick: index out of range for a list of ${items.length}`);
  }
  return item;
}

export function rngPickWeighted<T extends string>(rng: Rng, weights: Readonly<Record<T, number>>): T {
  const entries = Object.entries<number>(weights) as [T, number][]; // keys are T by construction
  let roll = rng() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [key, weight] of entries) {
    if (roll < weight) {
      return key;
    }
    roll -= weight;
  }
  throw new Error('rngPickWeighted: roll exceeded the total weight');
}

export function npcGenerate(request: NpcRequest, data: NpcData, rng: Rng): Npc {
  const race = request.race === 'random' ? rngPick(rng, RACES) : request.race;
  const gender = request.gender === 'random' ? rngPickWeighted(rng, GENDER_WEIGHTS) : request.gender;
  const firstPool = data.namesFirst[race][gender];
  const firstName = rngPick(rng, firstPool);
  const lastName = lastNameDraw(data.namesLast[race], gender, firstPool, firstName, rng);
  return { race, gender, firstName, lastName, quirk: rngPick(rng, data.quirks) };
}

function lastNameDraw(source: LastNameSource, gender: Gender, firstPool: readonly string[], firstName: string, rng: Rng): string | undefined {
  switch (source.kind) {
    case 'list':
      return rngPick(rng, source.entries);
    case 'none':
      return undefined;
    case 'patronymic': {
      // Another first name: exclude the one just drawn, unless it is the only entry.
      const others = firstPool.filter((name) => name !== firstName);
      return rngPick(rng, others.length > 0 ? others : firstPool) + source.suffix[gender];
    }
    default:
      return source satisfies never;
  }
}
