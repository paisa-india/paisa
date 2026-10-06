# Paisa

**Public money. Public knowledge.** An independent, open-source, politically neutral way for anyone in India to follow public money: where it comes from, where it goes, what is being built, who won the contracts, and what is running late or over budget.

Every number on the site comes from an official or openly licensed document and links back to it (file, page, hash and checks). Paisa never guesses a missing figure, and it never accuses anyone. Automated **signals** are observations, not findings of wrongdoing.

**Live site: <https://paisa-india.github.io/paisa/>**

> Paisa is independent. It is not affiliated with or endorsed by any government, ministry or political party.

## What it covers today

| Area | Coverage | Source |
|---|---|---|
| India: money in and out | Union Budget 2024-25 (actual) to 2026-27 (budget); monthly actuals April–August 2026 | Ministry of Finance, Controller General of Accounts |
| States | 31 states/UTs: where each ₹100 of income comes from and how day-to-day spending splits, 2023-24 to 2025-26 | RBI *State Finances: A Study of Budgets 2025-26* |
| Cities | 4,000+ urban local bodies: each city's income and spending per ₹100, FY 2015-16 to 2023-24, as a map dot, card and animated money story. Pune also has its 2024-25 audited accounts | cityfinance.in (Ministry of Housing and Urban Affairs); Pune Municipal Corporation |
| Big projects | 1,981 central projects ≥ ₹150 crore: cost then vs now, delay, work done, money spent | MoSPI Flash Report (April 2026) |
| Contracts | 5,715 Assam contract awards and 2,912 contractor profiles (tenders 2019–2023) | CivicDataLab with Assam Finance Department (ODbL) |
| Signals | Cost increases ≥ 25%, money far ahead of reported work, single-bid contracts, supplier concentration | Computed from the above, with rule and inputs shown |

What is **not** connected yet (and shown as such on the site): actual payments to contractors, central/Maharashtra contract awards (behind CAPTCHAs), CAG audit findings (site blocks traffic from outside India), city budgets (as opposed to accounts). See [docs/limitations.md](docs/limitations.md).

## How it works

```
Official source ──► saved copy (SHA-256) ──► reader ──► checks ──► published data ──► static website
   (PDF/Excel/HTML)    data/snapshots/        connectors/   totals must      data/*.json        GitHub Pages
                                                            add up, or stop
```

- **Daily, automatically** (GitHub Actions): checks every source, imports only what passes every check, and opens a pull request with a plain-language "what changed" note. A broken source opens an issue and the last good data stays live. See [docs/operations.md](docs/operations.md).
- **Static website**: pages are pre-built; search and filters run in the browser on published JSON files. No server or database is needed.
- **Free read-only data**: the published files at `/data/*.json` (index at `/data/index.json`) can be reused with the attributions in [DATA_LICENSES.md](DATA_LICENSES.md).

## Run it locally

Requires Node.js 22.13+.

```sh
npm ci
npm run dev            # http://127.0.0.1:3000
npm run update         # fetch → save → read → check → publish (needs internet)
npm run check          # lint, typecheck, tests, build
npm run build:static   # static site in apps/web/out (what GitHub Pages serves)
npm run test:browser   # browser tests against that build (first time: npx playwright install chromium)
```

Other commands: `npm run ingest` (rebuild from saved snapshots, offline), `node --import tsx scripts/import-rbi.ts` (after placing RBI files in `data/inbox/`), `node --import tsx scripts/import-projects.ts`, `node --import tsx scripts/import-contracts.ts`, `npm run api` (optional standalone read API server).

## Repository layout

```
apps/web          website (Next.js, static export)
apps/api          optional read API server (Fastify) and the query layer
apps/workers      ingestion pipeline
connectors/       one folder per source: download, read, validate
packages/         schema, query, signals, calculations, provenance, validation
scripts/          update, import and export commands
data/             saved source files, published data, change notes
docs/             sources, methodology, limitations, operations, research
```

## Maintainer

Paisa is created and maintained by **Amar Rokade** ([@amar-rokade](https://github.com/amar-rokade)). See [GOVERNANCE.md](GOVERNANCE.md) for how decisions are made and how to become a maintainer.

## Contributing

Contributions are welcome, especially new **connectors** (a state budget, a city's accounts, an official project or contract dataset). Start with [CONTRIBUTING.md](CONTRIBUTING.md). Found a wrong number or an official source we should use? [Open a data issue](../../issues/new?template=data-feedback.yml).

Please read the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, see [SECURITY.md](SECURITY.md).

## Licences

- **Code:** [AGPL-3.0-only](LICENSE). If you run a modified version as a public service, you must share your changes.
- **Data:** not covered by the code licence. Each source keeps its own terms; see [DATA_LICENSES.md](DATA_LICENSES.md) and [NOTICE](NOTICE).
