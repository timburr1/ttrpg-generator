import { GENDERS, type Gender, LAST_NAME_RULES, type LastNameSource, type NpcData, RACES, type Race } from '../npc';

const POOL_SIZE = 3;

function pool(prefix: string): string[] {
  return Array.from({ length: POOL_SIZE }, (_, index) => `${prefix}-${index}`);
}

function namesFirstFor(race: Race): Record<Gender, readonly string[]> {
  return { male: pool(`${race}-first-male`), female: pool(`${race}-first-female`), other: pool(`${race}-first-other`) };
}

function namesLastFor(race: Race): LastNameSource {
  const rule = LAST_NAME_RULES[race];
  return rule.kind === 'list' ? { kind: 'list', entries: pool(`${race}-last`) } : rule;
}

// Every entry is tagged with its pool (`dwarf-first-female-2`), so a draw from the wrong pool is visible in the result.
export function dataFixture(): NpcData {
  return {
    namesFirst: {
      dwarf: namesFirstFor('dwarf'),
      elf: namesFirstFor('elf'),
      gnome: namesFirstFor('gnome'),
      halfling: namesFirstFor('halfling'),
      'half-elf': namesFirstFor('half-elf'),
      'half-orc': namesFirstFor('half-orc'),
      human: namesFirstFor('human'),
      warforged: namesFirstFor('warforged'),
    },
    namesLast: {
      dwarf: namesLastFor('dwarf'),
      elf: namesLastFor('elf'),
      gnome: namesLastFor('gnome'),
      halfling: namesLastFor('halfling'),
      'half-elf': namesLastFor('half-elf'),
      'half-orc': namesLastFor('half-orc'),
      human: namesLastFor('human'),
      warforged: namesLastFor('warforged'),
    },
    quirks: pool('quirk'),
  };
}

// A complete, valid file map shaped like the real data/ folder, for tests that break one thing at a time.
export function dataFilesFixture(): Record<string, string> {
  const files: Record<string, string> = { 'data/npcs/quirks.md': '# Quirks\n\n- quirk-a\n- quirk-b\n' };
  for (const race of RACES) {
    for (const gender of GENDERS) {
      files[`data/npcs/names/${race}/first-${gender}.md`] = `# ${race} ${gender}\n\n- ${race}-${gender}-a\n- ${race}-${gender}-b\n`;
    }
    if (LAST_NAME_RULES[race].kind === 'list') {
      files[`data/npcs/names/${race}/last.md`] = `# ${race} last\n\n- ${race}-last-a\n- ${race}-last-b\n`;
    }
  }
  return files;
}
