# Contributing to Paisa

Thank you for helping people follow public money. Paisa's value is trust, so contributions follow a few strict rules.

## The rules

1. **Official or openly licensed sources only.** Every number must come from a government document or an openly licensed dataset, and link back to it.
2. **Never fabricate or estimate a missing figure.** Show the gap instead.
3. **Never bypass access controls.** That includes CAPTCHAs, logins, OTPs, bot protection and rate limits. Use a manual download inbox, or ask the publisher for a feed.
4. **Never accuse.** Paisa shows numbers and automated signals; it never says "corruption". No allegations against named people or companies, in code, data or issues.
5. **Keep definitions apart.** A budget is not spending, an award is not a payment, and an estimate is not an actual.
6. **Fail closed.** If a source changes format or totals don't add up, the import must stop and keep the last good data.

## Ways to help

- **Report a data problem or an official source:** [open a data issue](../../issues/new?template=data-feedback.yml).
- **Add a connector** for a state budget, city accounts, or an official project or contract dataset. See below.
- **Improve the site:** accessibility, Hindi or other language text, design, performance.
- **Review:** check numbers against their source PDFs and report anything that doesn't match.

## Adding a connector

Create `connectors/<source-name>/` with:

| File | Purpose |
|---|---|
| `index.ts` | Reader: turns the saved file into typed records and refuses anything unexpected (titles, headers, years, units) |
| `collect.ts` | Download from a fixed, allow-listed URL (conditional requests, timeouts, polite retries). For blocked sources, read from `data/inbox/` instead |
| Validation | Checks that the parts add up to the published totals, within documented rounding |
| Tests in `tests/` | The saved file reproduces the published records exactly; a corrupted file or changed format is rejected |
| `docs/sources.md` row | Source URL, coverage, update frequency, licence |

Your pull request should describe the source, its licence or terms, what is covered and what isn't, and include sample output. Look at `connectors/mospi-projects` (PDF tables reconciled against printed totals) or `connectors/rbi-state-finances` (manual inbox and Excel) as examples.

## Development

```sh
npm ci
npm run dev        # local site
npm run check      # must pass before a pull request: lint, typecheck, tests, build
```

- Money is stored as integer rupees or paise in decimal strings, never as floating point.
- Match the existing code style. Keep user-facing text in plain language, in both English and Hindi.
- Changes go through pull requests. `main` is protected: CI must pass, and only maintainers can merge. A first-time contributor's checks start once a maintainer approves them.

## Commits

Write clear commit messages describing what changed and why. By contributing you agree your code is licensed under AGPL-3.0-only, and that any data you add keeps its original licence, recorded in `DATA_LICENSES.md`.
