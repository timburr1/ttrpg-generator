# TTRPG Generator
![](https://img.shields.io/github/repo-size/timburr1/ttrpg-generator)
![](https://img.shields.io/github/contributors/timburr1/ttrpg-generator)
![](https://img.shields.io/github/last-commit/timburr1/ttrpg-generator)

[TTRPG Generator](https://wonderful-meadow-038c5bc10.5.azurestaticapps.net/) is a static web page of generators for tabletop game masters, switched by tab links. The NPC generator makes a race-appropriate first name, last name, and a quirk, for a race and gender the DM picks or leaves random. The Tavern generator makes a name, an innkeeper, the mood of the room, and an odd building feature. It deploys to the Azure Static Web Apps free tier; there is no backend.

```sh
npm run dev    # Vite dev server
npm run build  # typecheck, then production build into `dist/`
npm test       # full Vitest run
npm run check  # Biome lint and format check (`npx biome check --write .` fixes)
npx tsc        # typecheck
```
