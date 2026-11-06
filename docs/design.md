# TTRPG Generator: Prototype Design

Status: draft for the first functional prototype. Date: 2026-10-30. Revised after an adversarial design review. Updated 2026-11-05: content moved under `data/npcs/`, a Tavern generator added, and the page split into panes (section 17).

## 1. Goals and non-goals

### Goals

- A static single-page site, deployable to the Azure Static Web Apps free tier, that generates an NPC for a tabletop game master.
- The DM picks a race and a gender, or leaves either (or both) random.
- The result is a first name, a surname (where the race has one), and one small quirk.
- All content (names, quirks, tavern tables) lives in plain markdown files the DM edits without touching code.
- The page holds several generators as panes (NPC, Tavern, more later), switched by the URL hash.
- A structure that stays simple now and absorbs more fields (occupation, appearance, motivation) later without a rewrite.

### Non-goals for the prototype

- No backend, accounts, database, analytics, or cookies.
- No saved or shared NPCs, permalinks, export, or history.
- No per-field reroll or locking.
- No game-system stats. This is flavor only.
- No framework, router, state library, or service worker.

## 2. Requirements

Functional:

| ID | Requirement |
| --- | --- |
| F1 | Race choices: dwarf, elf, gnome, halfling, half-elf, half-orc, human, warforged, plus "Random". |
| F2 | Gender choices: male, female, other/NB, plus "Random". |
| F3 | "Generate" produces a first name, a surname where the race has one, and a quirk, drawn from the content files. |
| F3a | Surnames follow a per-race rule: a list (most races), a dwarf patronymic (another first name plus a gender suffix), or none (warforged have one name). |
| F4 | A random race or gender is resolved before the draw, and the result shows the resolved race and gender. |
| F5 | Each list draw is uniform over its entries. A random race is uniform; a random gender is weighted 46% male, 46% female, 8% other/NB. |
| F6 | Content edits require no code change, only a rebuild and deploy. |
| F7 | A Tavern pane generates a name ("The [first] [second]"), an innkeeper, the room tonight, and an odd building feature. |
| F8 | Every list draw, including the tavern's, is uniform over the entries in its file. Die sizes in the source book are ignored, so the DM can add or remove entries freely. |
| F9 | Panes are switched by links to `#npc`, `#tavern`, and so on. The hash selects the pane on load and on change; an empty or unknown hash selects the first. |

Non-functional:

- After the page loads it makes no network requests. (There is no service worker, so a cold reload with no signal fails.)
- Keyboard operable, screen-reader friendly, usable at phone width (DMs use phones at the table).
- Light and dark mode follow the OS.
- Malformed content fails loudly: in the test run (which gates deploy) and, in dev, as a visible error panel. It never produces a quietly wrong NPC.

## 3. Key decisions

| Decision | Choice | Alternatives and why not |
| --- | --- | --- |
| Language | TypeScript, `strict` | The output is a browser page and the work stack is TypeScript. |
| UI | Vanilla TS, direct DOM | React is overhead for one form and one card. Revisit past a few screens. |
| Build | Vite | Handles TS, raw-text imports, and `import.meta.glob`. Vitest runs through the same transform, so tests can use the same glob. |
| Content format | Markdown bullet lists, one list per file | JSON is hostile to hand editing. One file per race needs a sectioned parser. One list per file is the simplest format that diffs well. |
| Content delivery | Bundled into the JS at build time | Runtime `fetch` adds loading and failure states. Content is tens of KB. |
| Races and genders | Closed `as const` arrays in code | A manifest would let the DM add a race without code, but a race also needs a label and, later, mechanics. Adding one is a one-line change plus data files, and the integrity test lists what is missing. |
| Surname rules | A per-race rule table in code (`list`, `patronymic`, `none`), combined with the data at load time | Dwarf patronymics and single-name warforged are structural exceptions, not content. A closed set of three behaviors is code, not data. The suffixes sit in the same table, so the DM can change them in one place. |
| Randomness | Injected `Rng` function, `Math.random` in production | Hard-coding `Math.random` makes the generator untestable. |
| Hosting | Azure Static Web Apps, Free plan, GitHub Actions deploy | Blob static website needs a storage account and has no preview environments or header config. |
| Lint and format | Biome, line width 160 | Per CLAUDE-typescript.md. |
| Source layout | Flat `src/`, split when a file gets uncomfortable | The whole prototype is a few hundred lines. Directories per layer would outnumber the code. |

## 4. Architecture

Data flows one way. Everything except `data-files.ts` and the UI is pure and testable without a DOM or Vite.

```
data/**/*.md --(Vite glob, raw text)--> data-files.ts  exports Record<path, text>
                                          |
                                  dataLoad(files)    parse + validate once
                                          |
                         { npc: NpcData, tavern: TavernData }   typed, trusted from here on
                                          |
 form --> NpcRequest --> npcGenerate(request, data.npc, rng) --> Npc --> card
 button --> tavernGenerate(data.tavern, rng) --> Tavern --> card
```

Modules (all in `src/`):

| Module | Responsibility | Touches |
| --- | --- | --- |
| `rng.ts` | `Rng`, `rngPick`, `rngPickWeighted` | nothing external |
| `npc.ts` | `RACES`, `GENDERS`, `GENDER_WEIGHTS`, `LAST_NAME_RULES`, `NpcRequest`, `Npc`, `NpcData`, `npcGenerate` | `rng` |
| `tavern.ts` | `TavernData`, `Tavern`, `tavernGenerate` | `rng` |
| `data-load.ts` | `dataParseList` (text to entries), `dataLoad` (file map to `{ npc, tavern }`), `FILES_TAVERN`, `ErrorDataInvalid` | nothing external |
| `data-files.ts` | The one `import.meta.glob` call; exports the file map | Vite |
| `ui.ts` | `elementMake`, the pane shell (title, nav links, panels, hash handling), the error panel | DOM |
| `ui-npc.ts`, `ui-tavern.ts` | One pane each: controls, card, reads the form | DOM |
| `main.ts` | Wires `dataFiles`, `dataLoad`, `Math.random`, and the panes together; logs and shows data errors | everything |

Dependencies point one way: `data-load` imports types from `npc` and `tavern`; `npc` and `tavern` import only `rng`; `rng` imports nothing. The pane modules import `elementMake` from `ui`, and `ui` never imports them (`main.ts` wires the panes in). `data-files.ts` has no logic, so both `main.ts` and the real-data integrity test import it and load content identically.

Per CLAUDE-typescript.md, effects (randomness, the file map) are parameters at the entry point. `npc.ts` and `data-load.ts` never touch `Math.random`, `import.meta`, or the DOM.

## 5. Domain model

```ts
export const RACES = ['dwarf', 'elf', 'gnome', 'halfling', 'half-elf', 'half-orc', 'human', 'warforged'] as const;
export type Race = (typeof RACES)[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export type NpcRequest = { readonly race: Race | 'random'; readonly gender: Gender | 'random' };

export type Npc = {
  readonly race: Race;
  readonly gender: Gender;
  readonly firstName: string;
  readonly lastName: string | undefined; // undefined for races with a single name
  readonly quirk: string;
};

export const GENDER_WEIGHTS: Readonly<Record<Gender, number>> = { male: 46, female: 46, other: 8 };

// How each race forms a surname. 'list' draws from data/npcs/names/<race>/last.md; 'patronymic' takes another first name from the NPC's own pool and appends the suffix for the NPC's gender.
export type LastNameRule =
  | { readonly kind: 'list' }
  | { readonly kind: 'none' }
  | { readonly kind: 'patronymic'; readonly suffix: Readonly<Record<Gender, string>> };

export const LAST_NAME_RULES: Readonly<Record<Race, LastNameRule>> = {
  dwarf: { kind: 'patronymic', suffix: { male: 'ssen', female: 'sdottir', other: 'skind' } },
  warforged: { kind: 'none' },
  elf: { kind: 'list' },
  gnome: { kind: 'list' },
  halfling: { kind: 'list' },
  'half-elf': { kind: 'list' },
  'half-orc': { kind: 'list' },
  human: { kind: 'list' },
};

// A race's rule joined with its data, built by dataLoad.
export type LastNameSource =
  | { readonly kind: 'list'; readonly entries: readonly string[] }
  | { readonly kind: 'none' }
  | { readonly kind: 'patronymic'; readonly suffix: Readonly<Record<Gender, string>> };

export type NpcData = {
  readonly namesFirst: Readonly<Record<Race, Readonly<Record<Gender, readonly string[]>>>>;
  readonly namesLast: Readonly<Record<Race, LastNameSource>>;
  readonly quirks: readonly string[];
};
```

`NpcRequest` uses the literal `'random'` so the form's "Random" option maps to a value with no null handling.

Labels are `Record<Race, string>` and `Record<Gender, string>`, so the compiler demands a label for each new race or gender. The form uses "Other / NB". The card uses its own shorter wording for the same value, so a result does not read "Dwarf, Other / NB". Label text is utilitarian and the DM can change it.

Completeness is partly a compiler fact and partly a runtime one. The types say every race and gender has a first-name list and every race has a surname source. `dataLoad` fills the records in a loop over `RACES` and `GENDERS`, so it needs one cast, justified because it directly follows validation of every key. `readonly string[]` cannot express "non-empty", so `rngPick` guards that itself (section 7).

## 6. Content files

### Layout

```
data/
  npcs/
    README.md               authoring guide (not loaded)
    quirks.md               one global pool
    names/
      dwarf/
        first-male.md
        first-female.md
        first-other.md      (no last.md: dwarf surnames are built from first names)
      elf/ ...              first-male, first-female, first-other, and last
      gnome/ halfling/ half-elf/ half-orc/ human/
      warforged/            first-male, first-female, first-other (no last.md: one name)
  taverns/
    README.md               authoring guide (not loaded)
    name-first.md  name-second.md  innkeepers.md  rooms.md  features.md
```

Thirty NPC files (plus five tavern files): 8 races times 3 first-name files, plus a `last.md` for each of the 6 list races, plus quirks. Names are category first (`first-male`, `last`), so the first-name files group before `last.md` in a listing.

`data-files.ts` loads every markdown file under `data/` except READMEs, so a file the loader does not recognize is reported as an error instead of being silently ignored:

```ts
import.meta.glob(['/data/**/*.md', '!/data/**/README.md'], { query: '?raw', import: 'default', eager: true })
```

Glob keys are root-absolute (`/data/npcs/names/elf/last.md`). `dataLoad` strips the leading `/` so error messages show repo-relative paths (`data/npcs/names/elf/last.md`).

Vitest caches the transformed `data-files.ts` in `node_modules/.vitest-cache`, keyed by file content, and the cache does not notice new data files. If the integrity test reports a file as missing that exists on disk, delete that folder.

### Format

```markdown
# Dwarf: first names, male

> Notes to myself start with a greater-than sign.

- [Entry one]
- [Entry two]
```

Parse rules. The file is split on `\r\n`, `\r`, or `\n`, and each line is trimmed before it is classified. Trimming removes a leading BOM and non-breaking spaces as well as ordinary whitespace.

1. A line matching `^[-*+]\s+(.+)$` is an entry; the captured text is the entry. Indentation was trimmed away, so an indented bullet is an ordinary entry. A bullet marker with no text (`-`, `- `) is an error.
2. Blank lines and lines starting with `#` are ignored.
3. Lines starting with `>` are author notes and are ignored. To switch an entry off without deleting it, change its `-` to `>`.
4. Any other line is an error, for example: `data/npcs/names/dwarf/first-male.md:7: expected a "- " entry, a "#" heading, or a "> " note, got "Grimli the Bold"`. The offending line is quoted with `JSON.stringify` so invisible characters (non-breaking space, odd Unicode) are visible.

Rule 4 exists so a forgotten dash or a pasted paragraph fails loudly instead of silently dropping an entry. Thematic breaks (`---`, `- - -`) are not special: `---` is a rule 4 error, and `- - -` parses as the entry `- -`. The authoring guide does not mention them.

Entries are single-line plain text. Inline markdown is not interpreted and the UI renders with `textContent`.

### Validation (all in `dataLoad`)

Errors name the file and, where one applies, the line:

- Every file the rules require exists: the three `first-*.md` files for every race, `last.md` for each race whose rule is `list`, `quirks.md`, and the five tavern files (`FILES_TAVERN` in `data-load.ts`).
- A tavern name word (`name-first.md`, `name-second.md`) must not start with "The", because the page adds it.
- No file under `data/` is unaccounted for. This catches `data/npcs/names/elves/` and `first-nb.md`, and a `last.md` under a `none` or `patronymic` race, with a message saying why the file is not used.
- Every list has at least one entry.
- No duplicate entries within a list. Comparison is case-insensitive after `normalize('NFC')` and trim, so a macOS paste and a Windows paste of `Zoë` collide. The error reports both line numbers. Curly and straight apostrophes are not folded.
- Parse rules 1 and 4.

Duplicates across files are allowed, for example pasting the male and female pools into `first-other.md`.

`dataLoad` collects every problem and throws one `ErrorDataInvalid` listing them all, so the DM fixes a bad edit in one pass.

### Line endings and Git

This machine has `core.autocrlf=true`, so checkouts are CRLF on Windows and LF in Linux CI. The parser handles both, with a CRLF fixture in its tests. The repo also gets `.gitattributes` with `* text=auto eol=lf`, so working-tree files are LF everywhere and Biome's default `lf` line ending does not flag every checked-out file.

### Authoring decisions this design makes

- **Half-elf and half-orc have their own pools**, not computed from their parents. The DM can paste in names from the parent races.
- **Warforged have one name.** Their rule is `none`, so they have the three first-name files and no `last.md`.
- **Dwarf surnames are built.** The rule is `patronymic`: another first name from the dwarf pool of the NPC's own gender, plus a suffix (`ssen` male, `sdottir` female, `skind` other). The suffix is appended directly to the stem as written. Dwarves have no `last.md`.
- **"Other / NB" has its own first-name file per race.** No automatic merge of male and female pools, because a hidden merge is the fallback CLAUDE.md prohibits.
- **Quirks are global.** One pool for every race and gender.
- **Quirks do not use pronouns.** The card cannot know which pronoun fits. The authoring guide says to write a fragment with no subject, not a sentence that starts with he, she, or they, and gives no sample quirk (the DM writes the content).

## 7. Generation algorithm

`Rng`, `rngPick`, and `rngPickWeighted` live in `rng.ts`; `npc.ts` and `tavern.ts` import them.

```ts
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
  return { race, gender, firstName, lastName: lastNameDraw(data.namesLast[race], gender, firstPool, firstName, rng), quirk: rngPick(rng, data.quirks) };
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
```

`noUncheckedIndexedAccess` stays on. The guard is the one place the "non-empty list" invariant is enforced at draw time: an empty list or an `Rng` that returns `1` (a contract violation) throws a plain `Error`, a bug, rather than showing "undefined" on the card. No `!` is needed.

Behavior stated plainly:

- Draw order is fixed: race (if random), gender (if random), first name, surname stem (list and patronymic races only), quirk. A scripted `Rng` therefore pins which draw feeds which field. Note the number of `rng` calls depends on which fields are random.
- A random race is uniform over eight, so half-orcs and warforged appear as often as humans. A random gender is weighted 46% male, 46% female, 8% other/NB by `GENDER_WEIGHTS`, using one roll against the cumulative weights. A chosen race or gender is always honored.
- Draws are independent, with no repeat-avoidance. Rolling many NPCs repeats names and quirks once pools are small.

## 8. UI

### Layout

```
+--------------------------------------------+
|  TTRPG Generator                           |
|  [NPC] [Tavern]                            |
|                                            |
|  Race    [ Random          v ]             |
|  Gender  [ Random          v ]             |
|                                            |
|  [ Generate ]                              |
|                                            |
|  +--------------------------------------+  |
|  | [First] [Last, if any]               |  |
|  | [Race], [gender]                     |  |
|  | Quirk: [quirk]                       |  |
|  +--------------------------------------+  |
+--------------------------------------------+
```

### Behavior

- Two native `<select>` elements, each with a first option "Random" (value `random`) followed by the choices in the order the user listed them. Each has a visible `<label>`.
- "Generate" is a `<button type="button">` that calls `npcGenerate` with the current selections and renders the card. There is no `<form>` submit handling. Keyboard use is: Tab to the controls, arrow keys on a select, Space or Enter on the button.
- No NPC shows before the first click.
- The card shows the resolved race and gender, so a "Random" pick is visible.
- Selections persist across clicks, so the DM can roll the same race repeatedly.
- The result container is `aria-live="polite"` so screen readers announce a new NPC.

### Error state

If `dataLoad` throws `ErrorDataInvalid`, `main.ts` logs it with `console.error` and the page shows a panel listing each problem. The form is not rendered. In production this path should never fire, because the data-integrity test gates deploy. Its real use is `npm run dev` while the DM edits. The test failure prints the same list of problems.

### Styling

- One hand-written stylesheet, CSS custom properties for color, `prefers-color-scheme` for dark mode.
- Mobile first: one column, 16px minimum control font size (prevents iOS zoom on focus), comfortable tap targets.
- System font stack. No web fonts, no external requests.
- Style only through classes and `el.style.x = ...`. Never `setAttribute('style', ...)` or `style="..."` attributes, which the CSP blocks.

## 9. Project layout

```
.
  CLAUDE.md  CLAUDE-general.md  CLAUDE-typescript.md  AGENTS.md  README.md
  .gitattributes  .nvmrc  .gitignore
  docs/design.md
  data/                          content (section 6)
  index.html                     Vite entry
  package.json  package-lock.json  tsconfig.json  biome.json
  public/staticwebapp.config.json    Vite copies public/ into dist/
  .github/workflows/             CI and deploy (section 12)
  src/
    npc.ts            npc.test.ts
    data-load.ts      data-load.test.ts      data-real.test.ts
    data-files.ts
    rng.ts            rng.test.ts
    tavern.ts         tavern.test.ts
    ui.ts             ui.test.ts
    ui-npc.ts
    ui-tavern.ts
    main.ts
    style.css
    test-support/
      data-fixture.ts            builds a complete valid file map, and valid NpcData and TavernData
      rng-sequence.ts            scripted Rng: returns a fixed sequence of values
```

`AGENTS.md` is a plain text file whose entire content is `CLAUDE.md`. It is not a symlink (git here has `core.symlinks=false`), so an agent reading it only sees the name of the real file. That is the user's file and is left as is.

No `vite.config.ts`: Vite's and Vitest's defaults (root `index.html`, `**/*.test.ts`, Node test environment) cover this project. Add one when something needs it.

## 10. Tooling

- Current Node LTS, pinned in `.nvmrc` and used unchanged in CI. npm. `package-lock.json` pins Vite, Vitest, TypeScript, and Biome.
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `target` and `lib` ES2022 plus DOM, `module` ESNext, `moduleResolution` bundler, `noEmit`, `skipLibCheck`, `types: ["vite/client"]`.
- Scripts: `dev` is `vite`; `build` is `tsc && vite build`; `test` is `vitest run`; `check` is `biome check .`; `preview` is `vite preview`.
- `biome.json`: line width 160, recommended rules, `useBlockStatements` as an error, VCS ignore file enabled so `dist/` is skipped. The exact rule name for floating promises needs checking against the installed Biome version when scaffolding; the prototype has no async code.
- No runtime dependencies. Dev dependencies: `vite`, `vitest`, `typescript`, `@biomejs/biome`.

## 11. Testing

### Unit tests (Vitest, beside the code)

`data-load.test.ts`:

- Parser: `-`, `*`, and `+` bullets; surrounding and leading whitespace; headings, blanks, and `>` notes skipped; CRLF, lone CR, and LF all work; a leading BOM and a non-breaking space after the marker are tolerated; a bare marker with no text is an error; a stray prose line is an error with the correct file and line and a quoted copy of the line.
- Loader, using `data-fixture.ts` (a complete valid file map, broken one way per test): a complete map loads, with `none` and `patronymic` races carrying no entries; a missing file, an unknown file (including a `last.md` for dwarf or warforged), an empty list, and a duplicate (including an NFC and NFD pair) each raise `ErrorDataInvalid` naming the file; several problems are all reported in one error; duplicates across files are accepted.

`npc.test.ts`, with a scripted `Rng` (`rngSequence([0, 0.5, 0.99])`) and fixture data whose entries are tagged by pool, so a draw from the wrong pool is detectable:

- A fixed race and gender are honored and consume no draws.
- A random race resolves to a member of the set; the scripted values `0` and `0.99` select the first and last.
- Weighted gender: scripted rolls in each band map to male, female, and other, including both sides of each band edge (0.46 and 0.92); weights need not sum to 100.
- First name comes from the resolved race and gender pool and the quirk from the quirk pool. All 24 combinations covered.
- Surname rules: a `list` race draws from its list; warforged return `undefined` and consume no surname draw; a dwarf surname is a first name from the NPC's gender pool, never the drawn first name when the pool has two or more entries, followed by that gender's suffix; a one-entry pool reuses its entry.
- Draw order: with a script of distinct values, each field reflects the intended position.
- (`rngPick` and `rngPickWeighted` are tested in `rng.test.ts`: an empty list, an `Rng` returning `1`, and a roll past the total all throw.)

Per the "don't pin user-facing copy" rule, tests assert pool membership and relations, never literal content beyond fixtures the tests author.

### Data-integrity test: `data-real.test.ts`

Imports `data-files.ts`, the module the app uses, and runs `dataLoad` on the real `data/`. It asserts structure only. CI runs it before deploy, so a malformed edit blocks the release. A DM editing on github.com sees a failed check and must read the Actions log, which prints the full problem list. `data/npcs/README.md` says so.

### Not unit tested

The pane choice (`uiPaneFind`) is a pure function and is tested in `ui.test.ts`. The DOM code in `ui*.ts` and `main.ts` has no useful seam at this size. Manual smoke checklist:

1. `npm run dev`: form renders, no NPC card yet.
2. Generate with Random/Random several times: race and gender vary.
3. Pick each race and each gender: the card shows the chosen values.
4. Break a data file with a stray prose line: the error panel names the file and line. Revert.
5. Keyboard only: Tab to controls, arrow keys on selects, Space or Enter on the button.
6. Phone width and dark mode look right.
7. Panes: click each nav link; load `/#tavern` directly; Back and Forward switch panes; an unknown hash and `#%` show the NPC pane; results survive switching away and back.
8. On the deployed preview, the browser console shows no CSP violations.

## 12. Build and deployment (Azure Static Web Apps, Free plan)

- Create the Static Web App resource on the Free plan. Two ways to get the workflow: let the Azure wizard commit its generated `azure-static-web-apps-<name>.yml` to the default branch and edit that one file, or choose "Other" as the source, write the workflow by hand, and copy the deployment token into a repository secret. Pick one; do not keep two workflows.
- One job, in order: checkout, `actions/setup-node` with the `.nvmrc` version, `npm ci`, `npm run check`, `npm test`, `npm run build`, then the Azure deploy action. A failing step stops the deploy.
- The deploy action takes the already-built output: `skip_app_build: true`, `app_location: "dist"`, `output_location` empty, `api_location` empty. With `skip_app_build` the action uploads `app_location` as is and ignores `output_location`, so pointing `app_location` at the repo root would publish the source tree. Verify these semantics against the current SWA build-configuration docs when writing the workflow.
- Keep the wizard's `close_pull_request` job. Pull requests get preview environments, and the Free plan caps them (I recall three at once, to be confirmed). Close PRs promptly, and note that fork PRs do not receive the secret and preview URLs are public.
- `public/staticwebapp.config.json` sets `globalHeaders` only:
  - `Content-Security-Policy: default-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`. Vite's production build emits no inline script or style, so `'self'` suffices.
  - `X-Content-Type-Options: nosniff`.
  - No custom cache headers; SWA's defaults are adequate and a wrong `index.html` cache rule would pin users to an old build. No `navigationFallback`, since the site is one page.
- Free-plan limits (bandwidth, app size, custom domains, preview environments) are far above what a text-only page of a few hundred KB needs. I recall roughly 100 GB per month and 250 MB per app, but have not verified; check the [Azure Static Web Apps pricing page](https://azure.microsoft.com/pricing/details/app-service/static/) before launch.

## 13. Security and privacy

- No backend, cookies, storage, third-party requests, or analytics.
- Content is rendered with `textContent`, never `innerHTML`, so an entry containing markup displays literally. The CSP is the second layer.
- The content files come from the same repo, but the parser still treats them as untrusted text: it validates structure and renders as text.
- The repo is public and the content is bundled into the page, so every name, quirk, and tavern table is public. That matters only if the DM later adds campaign secrets.
- Supply chain: dev dependencies only, locked, installed with `npm ci`.

## 14. Later, not designed in detail

Each is a small change on this structure. None is built.

- Per-field reroll or locks: split `npcGenerate` into independent draws.
- More fields (occupation, appearance): a list file, a field on `NpcData` and `Npc`, a card row. Derive the loader's required-file list from one table so the integrity test follows.
- Race-specific quirks, pronoun tokens, weighted random race or gender, permalinks, copy to clipboard.
- A service worker, if real offline use matters.

## 15. Decisions made with the DM

- Other / NB has its own first-name file per race.
- Warforged have one name; dwarves build surnames from first names (`ssen`, `sdottir`, `skind`).
- Pronoun-free quirk fragments are fine.
- Random gender is 46% male, 46% female, 8% other/NB.

## 16. Implementation plan

Each commit builds and passes its own tests.

1. Docs and content: this design doc, the content stubs and `data/README.md`, `.gitattributes`.
2. Scaffold and domain: `package.json`, tooling configs, `.nvmrc`, `index.html`, `src/npc.ts` (including the surname rules and weighted gender) with its tests and test support (`rng-sequence`, the valid `NpcData` fixture). CI workflow without the deploy step.
3. Data boundary: `data-load.ts`, `data-files.ts`, their tests, and the real-data integrity test against the stubs.
4. UI: `ui.ts`, `main.ts`, `style.css`, smoke checklist.
5. Deploy: `public/staticwebapp.config.json` and the deploy step. Needs the Azure resource and token, which is the DM's action.

## 17. Tavern pane and pane switching (2026-11-05)

### Tavern

- Source: the DM's own book, transcribed once at their request with bold and italic removed. The tables are public through the bundle.
- A tavern is `{ name, innkeeper, room, feature }`. The name is `The ${nameFirst} ${nameSecond}`, so entries in `name-first.md` and `name-second.md` must not start with "The".
- Draw order: name first word, name second word, innkeeper, room, feature. Draws are uniform over each file, whatever the die in the book.
- Required files are the values of `FILES_TAVERN` in `data-load.ts`. The tavern files go through the same parse, empty, and duplicate checks as NPC files, and the same single `ErrorDataInvalid` lists problems from both folders.
- Not built: the book's secrets, patrons, rumors, menu, trouble, and loot tables.

### Panes

- `uiMount` shows a title, a `<nav aria-label="Generators">` of links (`#npc`, `#tavern`), and one panel per pane. Each pane is built once and toggled with `hidden`, so its last result and form selections survive switching.
- One `hashchange` listener plus an initial read decide the active pane. Links only change the hash, so back/forward, deep links, and open-in-new-tab share that path; keyboard use is native link use. The active link carries `aria-current="page"`. Panel ids are `pane-<id>` and form control ids are prefixed with their pane (`npc-race`), so a pane hash never matches an id and the browser does not scroll. The hash is compared as written, never decoded, so a malformed hash falls back to the first pane.
- Adding a pane: a data folder and `*Data` type, a `*Generate` function, a `ui-*.ts` pane module, a loader entry, and one line in `main.ts`.
- A malformed file in either data folder replaces the whole page with the error panel (dev-time only; the integrity test gates deploy).
