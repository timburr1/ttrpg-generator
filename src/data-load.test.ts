import { describe, expect, it } from 'vitest';
import { dataLoad, dataParseList, ErrorDataInvalid, FILES_TAVERN } from './data-load';
import { GENDERS, RACES } from './npc';
import { dataFilesFixture } from './test-support/data-fixture';

const PATH = 'data/x.md';

function entryTexts(text: string): string[] {
  return dataParseList(text, PATH).entries.map((entry) => entry.text);
}

function problemsOf(files: Record<string, string>): readonly string[] {
  try {
    dataLoad(files);
  } catch (error) {
    if (error instanceof ErrorDataInvalid) {
      return error.problems;
    }
    throw error;
  }
  throw new Error('expected dataLoad to throw ErrorDataInvalid');
}

describe('dataParseList', () => {
  it('reads -, *, and + bullets and trims the entries', () => {
    expect(entryTexts('- one\n*   two  \n+ three\n')).toEqual(['one', 'two', 'three']);
  });

  it('accepts indented bullets as ordinary entries', () => {
    expect(entryTexts('  - one\n\t- two')).toEqual(['one', 'two']);
  });

  it('skips headings, blank lines, and notes', () => {
    expect(entryTexts('# Heading\n\n> a note\n- one\n> - switched off\n')).toEqual(['one']);
  });

  it('reads CRLF, lone CR, and LF the same way', () => {
    const lf = entryTexts('# h\n\n- one\n- two\n');
    expect(entryTexts('# h\r\n\r\n- one\r\n- two\r\n')).toEqual(lf);
    expect(entryTexts('# h\r\r- one\r- two\r')).toEqual(lf);
  });

  it('tolerates a leading BOM and a non-breaking space after the marker', () => {
    expect(entryTexts('﻿# heading\n- one\n')).toEqual(['one']);
  });

  it('records 1-based line numbers', () => {
    expect(dataParseList('# h\n\n- one\n- two', PATH).entries.map((entry) => entry.line)).toEqual([3, 4]);
  });

  it('reports a stray line with its file and line number, and shows invisible characters', () => {
    const { entries, problems } = dataParseList('- one\nprose line\n- two', PATH);
    expect(entries).toHaveLength(2);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`${PATH}:2`);
    expect(problems[0]).toContain('\\u00a0');
  });

  it('reports a bullet with no text', () => {
    expect(dataParseList('-\n- \n- one', PATH).problems).toHaveLength(2);
  });

  it('treats a rule line as an error and a spaced rule as an entry', () => {
    expect(dataParseList('---', PATH).problems).toHaveLength(1);
    expect(entryTexts('- - -')).toHaveLength(1);
  });
});

describe('dataLoad', () => {
  it('loads a complete file map, with or without a leading slash on the keys', () => {
    const files = dataFilesFixture();
    const slashed = Object.fromEntries(Object.entries(files).map(([path, text]) => [`/${path}`, text]));
    expect(dataLoad(slashed)).toEqual(dataLoad(files));
  });

  it('gives every race and gender a first-name list and every race a surname source', () => {
    const data = dataLoad(dataFilesFixture()).npc;
    for (const race of RACES) {
      expect(data.namesLast[race]).toBeDefined();
      for (const gender of GENDERS) {
        expect(data.namesFirst[race][gender].length).toBeGreaterThan(0);
      }
    }
    expect(data.quirks.length).toBeGreaterThan(0);
  });

  it('turns a list race into entries and leaves dwarf and warforged without any', () => {
    const data = dataLoad(dataFilesFixture()).npc;
    expect(data.namesLast.elf.kind).toBe('list');
    expect(data.namesLast.dwarf.kind).toBe('patronymic');
    expect(data.namesLast.warforged.kind).toBe('none');
  });

  it('reports a missing file by path', () => {
    const files = dataFilesFixture();
    delete files['data/npcs/names/elf/first-female.md'];
    expect(problemsOf(files).some((problem) => problem.includes('data/npcs/names/elf/first-female.md'))).toBe(true);
  });

  it('reports an unknown file, and a last.md for a race that does not use one', () => {
    const files = {
      ...dataFilesFixture(),
      'data/npcs/names/elves/last.md': '- x',
      'data/npcs/names/dwarf/last.md': '- x',
      'data/npcs/names/warforged/last.md': '- x',
    };
    const problems = problemsOf(files);
    expect(problems).toHaveLength(3);
    for (const path of ['data/npcs/names/elves/last.md', 'data/npcs/names/dwarf/last.md', 'data/npcs/names/warforged/last.md']) {
      expect(problems.some((problem) => problem.startsWith(path))).toBe(true);
    }
    expect(new Set(problems.map((problem) => problem.slice(problem.indexOf(':')))).size).toBeGreaterThan(1);
  });

  it('reports a list with no entries, including a file with only a heading', () => {
    const files = { ...dataFilesFixture(), 'data/npcs/quirks.md': '# Quirks\n' };
    expect(problemsOf(files)).toEqual([expect.stringContaining('data/npcs/quirks.md')]);
  });

  it('reports a duplicate with both line numbers, case-insensitively and across Unicode normalization forms', () => {
    const files = { ...dataFilesFixture(), 'data/npcs/quirks.md': '- Zoë\n- other\n- zoë\n' };
    const problems = problemsOf(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('data/npcs/quirks.md:3');
    expect(problems[0]).toContain('line 1');
  });

  it('accepts the same entry in different files', () => {
    const files = dataFilesFixture();
    files['data/npcs/names/elf/first-other.md'] = files['data/npcs/names/elf/first-male.md'] ?? '';
    expect(() => dataLoad(files)).not.toThrow();
  });

  it('reports every problem in one error', () => {
    const files = dataFilesFixture();
    delete files['data/npcs/names/human/last.md'];
    files['data/npcs/quirks.md'] = 'stray prose';
    files['data/npcs/names/elf/first-male.md'] = '- a\n- a';
    const problems = problemsOf(files);
    expect(problems.length).toBeGreaterThanOrEqual(3);
  });

  it('loads each tavern list from its own file', () => {
    const { tavern } = dataLoad(dataFilesFixture());
    for (const key of Object.keys(FILES_TAVERN) as (keyof typeof FILES_TAVERN)[]) {
      expect(tavern[key]).toEqual([`${key}-a`, `${key}-b`]);
    }
  });

  it('reports a tavern name word that starts with "The", and accepts one that merely contains it', () => {
    const files = { ...dataFilesFixture(), [FILES_TAVERN.nameFirst]: '- The Crooked\n- Other\n', [FILES_TAVERN.nameSecond]: '- Theatre\n- Gather\n' };
    const problems = problemsOf(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`${FILES_TAVERN.nameFirst}:1`);
  });

  it('reports a missing, empty, or duplicated tavern file by path', () => {
    const files = dataFilesFixture();
    delete files[FILES_TAVERN.rooms];
    files[FILES_TAVERN.features] = '# Features\n';
    files[FILES_TAVERN.innkeepers] = '- a\n- A\n';
    const problems = problemsOf(files);
    expect(problems).toHaveLength(3);
    for (const path of [FILES_TAVERN.rooms, FILES_TAVERN.features, FILES_TAVERN.innkeepers]) {
      expect(problems.some((problem) => problem.includes(path))).toBe(true);
    }
  });

  it('reports an unknown file in the taverns folder, and a README (which the glob, not the loader, excludes)', () => {
    const files = { ...dataFilesFixture(), 'data/taverns/rumors.md': '- x', 'data/taverns/README.md': '# Guide' };
    const problems = problemsOf(files);
    expect(problems).toHaveLength(2);
    expect(problems.some((problem) => problem.startsWith('data/taverns/rumors.md'))).toBe(true);
    expect(problems.some((problem) => problem.startsWith('data/taverns/README.md'))).toBe(true);
  });

  it('reports problems from the npc and tavern files in one error', () => {
    const files = dataFilesFixture();
    files['data/npcs/quirks.md'] = 'stray prose';
    delete files[FILES_TAVERN.nameFirst];
    const problems = problemsOf(files);
    expect(problems.some((problem) => problem.startsWith('data/npcs/quirks.md'))).toBe(true);
    expect(problems.some((problem) => problem.startsWith(FILES_TAVERN.nameFirst))).toBe(true);
  });
});
