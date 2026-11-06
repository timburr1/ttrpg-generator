# CLAUDE.md

@CLAUDE-general.md
@CLAUDE-typescript.md

## Project overview

TTRPG Generator is a static web page of generators for tabletop game masters, one pane each, switched by the URL hash. The NPC pane generates a race-appropriate first name, a last name, and a quirk, for a race and gender the DM picks or leaves random. The Tavern pane generates a name, an innkeeper, the room's mood, and an odd building feature. It deploys to the Azure Static Web Apps free tier. There is no backend.

The architecture and rationale live in [docs/design.md](docs/design.md). Read it before changing structure.

## Stack

TypeScript (strict), Vite with no UI framework, Vitest, Biome. Content lives in markdown files under `data/npcs/` and `data/taverns/` and is bundled into the page at build time.

## Commands

- `npm run dev` — Vite dev server.
- `npm run build` — typecheck, then production build into `dist/`.
- `npm test` — full Vitest run.
- `npm run check` — Biome lint and format check (`npx biome check --write .` fixes).
- `npx tsc` — typecheck.

## Project-specific rules

- **The DM authors all content.** Everything under `data/` is the author's prose. Never write real names or quirks there; use obvious placeholders such as `[Dwarf First Male 1]`. Adding structure (new files, new lists) is fine; filling them is not.
- **Data format is a contract.** The rules in [data/npcs/README.md](data/npcs/README.md) and [data/taverns/README.md](data/taverns/README.md) are enforced by the loader and the data-integrity test. Change the rules and the test together.
- **No silent data fallbacks.** A missing, empty, or malformed data file is an error that names the file and line. Never fall back to another pool or an empty list.
- **Tests don't pin content.** Data-integrity tests check structure (non-empty, no duplicates, every race and gender covered), never specific names or quirk text.
- **No changelog yet.** The site has no release process; skip the CHANGELOG step until the project adds one.
