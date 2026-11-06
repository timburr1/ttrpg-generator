import { describe, expect, it } from 'vitest';
import { GENDER_WEIGHTS, GENDERS, type Gender, LAST_NAME_RULES, npcGenerate, RACES } from './npc';
import { dataFixture } from './test-support/data-fixture';
import { rngSequence } from './test-support/rng-sequence';

function dwarfSuffix(gender: Gender): string {
  const rule = LAST_NAME_RULES.dwarf;
  if (rule.kind !== 'patronymic') {
    throw new Error('test assumes dwarves use patronymic surnames');
  }
  return rule.suffix[gender];
}

describe('GENDER_WEIGHTS', () => {
  it('covers every gender with a positive weight', () => {
    for (const gender of GENDERS) {
      expect(GENDER_WEIGHTS[gender]).toBeGreaterThan(0);
    }
  });
});

describe('npcGenerate', () => {
  const data = dataFixture();

  it('honors a fixed race and gender and draws only first name, surname, and quirk', () => {
    const { rng, remaining } = rngSequence([0.5, 0.5, 0.5]);
    const npc = npcGenerate({ race: 'elf', gender: 'female' }, data, rng);
    expect(npc).toEqual({ race: 'elf', gender: 'female', firstName: 'elf-first-female-1', lastName: 'elf-last-1', quirk: 'quirk-1' });
    expect(remaining()).toBe(0);
  });

  it('maps the ends of a random race roll to the first and last race', () => {
    const first = npcGenerate({ race: 'random', gender: 'male' }, data, rngSequence([0, 0, 0, 0]).rng);
    const last = npcGenerate({ race: 'random', gender: 'male' }, data, rngSequence([0.99, 0, 0]).rng);
    expect([first.race, last.race]).toEqual([RACES[0], RACES[RACES.length - 1]]);
  });

  it('rolls a random gender into the weighted bands', () => {
    const genderFor = (roll: number) => npcGenerate({ race: 'elf', gender: 'random' }, data, rngSequence([roll, 0, 0, 0]).rng).gender;
    expect([genderFor(0), genderFor(0.459), genderFor(0.461), genderFor(0.919), genderFor(0.921), genderFor(0.99)]).toEqual([
      'male',
      'male',
      'female',
      'female',
      'other',
      'other',
    ]);
  });

  it('draws in the order race, gender, first name, surname, quirk', () => {
    // 0.8125 is the middle of the seventh of eight races (human).
    const npc = npcGenerate({ race: 'random', gender: 'random' }, data, rngSequence([0.8125, 0.95, 0.5, 0.99, 0]).rng);
    expect(npc).toEqual({ race: 'human', gender: 'other', firstName: 'human-first-other-1', lastName: 'human-last-2', quirk: 'quirk-0' });
  });

  it('draws from the pools of the resolved race and gender, for all 24 combinations', () => {
    for (const race of RACES) {
      for (const gender of GENDERS) {
        const npc = npcGenerate({ race, gender }, data, rngSequence([0, 0, 0]).rng);
        expect(npc.firstName.startsWith(`${race}-first-${gender}-`)).toBe(true);
        expect(npc.quirk.startsWith('quirk-')).toBe(true);
        if (LAST_NAME_RULES[race].kind === 'list') {
          expect(npc.lastName?.startsWith(`${race}-last-`)).toBe(true);
        }
      }
    }
  });

  it('gives warforged no surname and spends no draw on one', () => {
    const { rng, remaining } = rngSequence([0.99, 0.5, 0.5]);
    const npc = npcGenerate({ race: 'random', gender: 'female' }, data, rng);
    expect(npc).toMatchObject({ race: 'warforged', firstName: 'warforged-first-female-1', lastName: undefined, quirk: 'quirk-1' });
    expect(remaining()).toBe(0);
  });

  it('builds a dwarf surname from another first name of the same gender plus that gender suffix', () => {
    for (const gender of GENDERS) {
      for (const firstRoll of [0, 0.5, 0.99]) {
        for (const stemRoll of [0, 0.99]) {
          const npc = npcGenerate({ race: 'dwarf', gender }, data, rngSequence([firstRoll, stemRoll, 0]).rng);
          const suffix = dwarfSuffix(gender);
          expect(npc.lastName?.endsWith(suffix)).toBe(true);
          const stem = npc.lastName?.slice(0, -suffix.length);
          expect(stem?.startsWith(`dwarf-first-${gender}-`)).toBe(true);
          expect(stem).not.toBe(npc.firstName);
        }
      }
    }
  });

  it('reuses the only first name when a dwarf pool has a single entry', () => {
    const single = { ...data, namesFirst: { ...data.namesFirst, dwarf: { ...data.namesFirst.dwarf, female: ['only'] } } };
    const npc = npcGenerate({ race: 'dwarf', gender: 'female' }, single, rngSequence([0, 0, 0]).rng);
    expect(npc.lastName).toBe(`only${dwarfSuffix('female')}`);
  });
});
