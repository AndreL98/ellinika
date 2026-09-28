# Contributing

Thank you for helping. Please read [APP.md](APP.md) first.

## Code

- Small pull requests, one feature or fix each. Never push to `main` directly.
- TypeScript strict, few dependencies. Explain every new dependency (size, maintenance, license).
- No hard-coded UI text: use i18n keys (`locales/de.json` first).
- No content in code: all texts live in `content/packs`.
- Mobile first, keyboard accessible, sufficient contrast, `lang` and `dir` set per text.
- `npm run check` must pass before a pull request.

## Content

- Liturgical texts only from official versions of the respective Orthodox Church. Every line has a source.
- No personal theological interpretation. Explanations only with a source.
- Respect copyright: modern translations only with permission or in the public domain.
- Status per text: `draft` → `reviewed` → `approved`. Only `approved` appears in the public app.
  Liturgical texts are approved by a priest or a person commissioned by the Church.
- Transliteration and pronunciation stay marked as `ai_suggestion` until a native speaker verified them.
- Item IDs are stable and must never be renamed.
