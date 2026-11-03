# TTRPG Generator
![](https://img.shields.io/github/repo-size/timburr1/ttrpg-generator)
![](https://img.shields.io/github/contributors/timburr1/ttrpg-generator)
![](https://img.shields.io/github/last-commit/timburr1/ttrpg-generator)

[TTRPG Generator](https://wonderful-meadow-038c5bc10.5.azurestaticapps.net/) is a static web page that rolls up NPCs for tabletop game masters. The first prototype generates a race-appropriate first name, last name, and a quirk, for a race and gender the DM picks or leaves random. It deploys to the Azure Static Web Apps free tier; there is no backend.

```sh
npm run dev    # Vite dev server
npm run build  # typecheck, then production build into `dist/`
npm test       # full Vitest run
npm run check  # Biome lint and format check (`npx biome check --write .` fixes)
npx tsc        # typecheck
```
