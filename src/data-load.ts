import { GENDERS, type Gender, LAST_NAME_RULES, type LastNameSource, type NpcData, RACES, type Race } from './npc';

export class ErrorDataInvalid extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      `Content files are invalid (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n${problems.map((problem) => `- ${problem}`).join('\n')}`,
    );
    this.name = 'ErrorDataInvalid';
    this.problems = problems;
  }
}

export type DataEntry = { readonly text: string; readonly line: number };

const ENTRY_PATTERN = /^[-*+](?:\s+(.*))?$/;
const DATA_ROOT = 'data';

// Quotes a line with everything outside printable ASCII escaped, so invisible characters (non-breaking space, BOM) show up in the message.
function quote(line: string): string {
  return `"${line.replace(/[^\x20-\x7e]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)}"`;
}

// Parses one content file. Line numbers are 1-based; problems are reported rather than thrown so the caller can collect every problem across files.
export function dataParseList(text: string, path: string): { entries: DataEntry[]; problems: string[] } {
  const entries: DataEntry[] = [];
  const problems: string[] = [];
  text.split(/\r\n|\r|\n/).forEach((raw, index) => {
    const line = index + 1;
    // trim() also removes a leading BOM and non-breaking spaces.
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('>')) {
      return;
    }
    const match = ENTRY_PATTERN.exec(trimmed);
    if (match === null) {
      problems.push(`${path}:${line}: expected a "- " entry, a "#" heading, or a ">" note, got ${quote(trimmed)}`);
    } else if (match[1] === undefined || match[1] === '') {
      problems.push(`${path}:${line}: bullet with no text`);
    } else {
      entries.push({ text: match[1], line });
    }
  });
  return { entries, problems };
}

function pathFirst(race: Race, gender: Gender): string {
  return `${DATA_ROOT}/names/${race}/first-${gender}.md`;
}

function pathLast(race: Race): string {
  return `${DATA_ROOT}/names/${race}/last.md`;
}

const PATH_QUIRKS = `${DATA_ROOT}/quirks.md`;

function pathsExpected(): Set<string> {
  const paths = new Set<string>([PATH_QUIRKS]);
  for (const race of RACES) {
    for (const gender of GENDERS) {
      paths.add(pathFirst(race, gender));
    }
    if (LAST_NAME_RULES[race].kind === 'list') {
      paths.add(pathLast(race));
    }
  }
  return paths;
}

function problemUnexpected(path: string): string {
  for (const race of RACES) {
    const rule = LAST_NAME_RULES[race];
    if (path === pathLast(race) && rule.kind !== 'list') {
      const reason = rule.kind === 'none' ? 'has a single name' : 'builds its last names from first names';
      return `${path}: not used, because ${race} ${reason}; remove the file`;
    }
  }
  return `${path}: not a recognized content file`;
}

// Loads content from a map of file path to file text. Glob keys may carry a leading "/".
export function dataLoad(files: Readonly<Record<string, string>>): NpcData {
  const texts = new Map(Object.entries(files).map(([path, text]) => [path.replace(/^\//, ''), text]));
  const expected = pathsExpected();
  const problems: string[] = [];

  for (const path of [...texts.keys()].sort()) {
    if (!expected.has(path)) {
      problems.push(problemUnexpected(path));
    }
  }

  const lists = new Map<string, string[]>();
  for (const path of [...expected].sort()) {
    const text = texts.get(path);
    if (text === undefined) {
      problems.push(`${path}: missing file`);
      continue;
    }
    const parsed = dataParseList(text, path);
    problems.push(...parsed.problems);
    const seen = new Map<string, number>();
    for (const entry of parsed.entries) {
      const key = entry.text.normalize('NFC').toLowerCase();
      const firstLine = seen.get(key);
      if (firstLine === undefined) {
        seen.set(key, entry.line);
      } else {
        problems.push(`${path}:${entry.line}: duplicate of line ${firstLine} (${quote(entry.text)})`);
      }
    }
    if (parsed.entries.length === 0 && parsed.problems.length === 0) {
      problems.push(`${path}: no entries`);
    }
    lists.set(
      path,
      parsed.entries.map((entry) => entry.text),
    );
  }

  if (problems.length > 0) {
    throw new ErrorDataInvalid(problems);
  }

  const list = (path: string): readonly string[] => {
    const entries = lists.get(path);
    if (entries === undefined) {
      throw new Error(`dataLoad: no parsed list for ${path} although validation passed`);
    }
    return entries;
  };
  const namesLastFor = (race: Race): LastNameSource => {
    const rule = LAST_NAME_RULES[race];
    return rule.kind === 'list' ? { kind: 'list', entries: list(pathLast(race)) } : rule;
  };
  // Safe casts: validation above guarantees a value for every race and gender key.
  const namesFirst = Object.fromEntries(
    RACES.map((race) => [race, Object.fromEntries(GENDERS.map((gender) => [gender, list(pathFirst(race, gender))]))]),
  ) as NpcData['namesFirst'];
  const namesLast = Object.fromEntries(RACES.map((race) => [race, namesLastFor(race)])) as NpcData['namesLast'];
  return { namesFirst, namesLast, quirks: list(PATH_QUIRKS) };
}
