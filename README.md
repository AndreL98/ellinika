# Logos (working title)

Free, open-source learning app: Orthodox prayers, terms and liturgical calls with
pronunciation, transliteration and sourced explanations – plus everyday Greek and Russian.

No ads, no tracking, works offline. Web app (PWA) first; iOS, Android and Linux later.

- Project handbook: [docs/APP.md](docs/APP.md)
- How to contribute: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- Text sources: [docs/SOURCES.md](docs/SOURCES.md)

## Development

Requires Node.js 22.12 or newer (see `.nvmrc`).

```bash
npm ci
npm run dev               # local dev server
npm run check             # typecheck, content validation, unit tests, build, browser tests
```

| Script | Purpose |
|---|---|
| `npm run typecheck` | TypeScript strict check (also checks JS in `scripts/`) |
| `npm run validate:content` | JSON schema and cross-file checks for `content/packs` |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build to `app/dist` incl. generated `sw.js` |
| `npm run test:e2e` | Browser tests (Playwright) against the production build |

First-time Playwright setup: `npx playwright install chromium`.

## Repository layout

```
app/            source (src/, public/, index.html, vite.config.ts, build/)
content/schema  JSON schemas for packs, language texts and glosses
content/packs   orthodox/ and general/ packs (core.json + <lang>.json + gloss/)
locales/        UI texts, i18next JSON v4
docs/           APP.md, CONTRIBUTING.md, SOURCES.md
prototype/      files of the first Ellinika prototype (reference for phase 1)
scripts/        validate-content.mjs
tests/          unit/ (Vitest), e2e/ (Playwright), fixtures/
```

## Deployment

GitHub Actions builds and tests every push and pull request. Pushes to `main` are
deployed to GitHub Pages (Settings → Pages → Source: "GitHub Actions").

## License

- Code: [MIT](LICENSE)
- Project content (explanations, transliteration, UI texts, own recordings): [CC BY-SA 4.0](content/LICENSE.md)
- Liturgical texts: license or permission of the respective source, see [docs/SOURCES.md](docs/SOURCES.md)
