# Limitations

What Paisa does **not** do yet, and how to read what it does show. Keep this file in step with the code. The site's Data Sources page shows each source's period and when it was last verified.

## Money flows

- **India:** Union Budget 2024-25 (actual) to 2026-27 (budget), and CGA monthly accounts for April–August 2026 (provisional, unaudited). Major items only: a full ministry/department hierarchy and scheme inventory are not connected.
- **States:** from RBI *State Finances* Statements 33–34. These are **ratios to GSDP**, not rupee amounts, so the site shows "per ₹100" shares; rounding to 0.1% of GSDP can move a share by about ₹1. Revenue account only (no capital spending). Five UTs without a legislature (Ladakh, Chandigarh, Andaman & Nicobar, Lakshadweep, Dadra-Daman) are not in RBI's study. Spending RBI classifies as neither development nor non-development (up to 1.2% of GSDP) is shown as "Other spending". Rupee amounts need RBI's appendix tables (not imported). RBI blocks scripted downloads, so a person adds each new edition (the daily run opens a reminder issue). Official LGD codes are still null.
- **Cities:** cityfinance.in's standardised annual accounts, FY 2015-16 to 2023-24: 4,329 of 5,105 cities have at least one year.
  - These are accrual accounts, not budgets. Depreciation and provisions are bookkeeping entries, shown striped.
  - cityfinance groups categories differently in some years (for example Pune 2023-24 puts the State's assigned revenue under tax revenue), so compare single categories across years with care.
  - A year is published only if its items add up exactly to cityfinance's totals; 19 city-years that don't are excluded, as are 2 test entries in cityfinance's list.
  - 185 cities have no coordinates and appear in search but not on the map.
  - Reuse terms: permission requested; figures carry attribution and a link to each city's cityfinance page.
- **Pune** also has PMC's own audited accounts for FY 2024-25 (18 revenue-account schedule totals). Capital expenditure, the balance sheet and budgets are not extracted. The PMC face statement is a scanned image; parsed totals are checked against a transcription in `connectors/pmc-accounts/reviewed-statement.ts`, which a maintainer should independently re-check. pmc.gov.in lists documents client-side, so a new year is added by hand as a reviewed, pinned file.

## Projects

- MoSPI's central-sector projects of ₹150 crore and above, as reported by ministries. State, city and smaller projects are not included.
- The latest report Paisa has is **April 2026**. Newer reports sit behind MoSPI's script-blocked listing; add their PDF links to `KNOWN_REPORTS` in `connectors/mospi-projects/index.ts`. Until then the Data Sources page marks this source "waiting for newer data".
- "Late" compares the original and revised completion dates in the same report; "past due date" means the current due date is before the report month.

## Contracts and contractors

- **Assam only**, tenders 2019–2023: a civil-society compilation (CivicDataLab, with the Assam Finance Department) of the state e-tender portal under ODbL, not a direct government release. Central (CPPP) and Maharashtra awards sit behind CAPTCHAs and are not connected.
- Award values are values at award, **not payments**; payment records are not public, so there is no end-to-end money trace to a contractor. 237 awards with no usable value are excluded. Awards outside 0.1–10× their tender estimate (often unit rates such as ₹ per trip), or without an estimate, are listed but not counted in totals.
- The dataset's `statistics.value` field is inconsistent with award values (×100 to ×10,000) and is ignored. Its dates are YYYY-DD-MM and are converted.
- **Contractor entries are published-name groups, not verified identities.** Awards are grouped by the exact supplier name (case and spacing ignored). The source has no registration numbers, so different firms or people with the same name can be combined, and spelling variants stay separate. Some suppliers are individuals, shown exactly as named in official award records. No owner, director or relative information is collected.

## Signals

Signals are automated observations, not findings of wrongdoing. Each one shows its rule, inputs, period and source.

- 242 cost increases of 25%+ (revised vs original approved cost), and 11 projects where spending is at least 75% of current cost while reported work done is at most 50%.
- 243 single-bid awards.
- Supplier concentration: a published name receiving at least 60% of a department's checked awarded value **in one fiscal year** (by tender date), with at least 5 awards in that set. Awards without a tender date are left out. Each signal links to exactly the awards it compares.

## Site and operations

- The site is static (GitHub Pages); search and filters run in the browser on published JSON files.
- Published data files (`/data/*.json`) and the saved source copies in `data/snapshots/` are public. Reuse terms for several government sources are still under review; see [DATA_LICENSES.md](../DATA_LICENSES.md).
- "Raise a concern" only prepares drafts (an RTI request or a grievance) and an evidence summary, with a link to the official channel: RTI Online and CPGRAMS for central authorities only. For state and city authorities Paisa names the authority but lists no portal, because it does not verify state portals. Paisa never submits or stores a draft.
- National item explanations ("What this means") are short, hand-written summaries in `apps/web/lib/meaning.ts`. They need review by someone with public-finance expertise. Recipients are shown only as types (for example "holders of government securities"), never as named payees.
- Ask Paisa uses constrained matching over the published budget records, not a language model. It does not answer arbitrary questions.
- Hindi covers navigation, explanations and the money stories. Source titles, audit metadata and some detailed text remain in English. No human review of the financial glossary has happened yet.
- Responsive layout and keyboard use are built and covered by browser tests for key journeys, but no full WCAG 2.2 AA audit has been done. Do not claim conformance.
- Updates run on GitHub Actions: daily for most sources, monthly for cityfinance. A broken source opens a GitHub issue and its last verified data stays live. GitHub's runners are outside India; if a government site blocks them, use a self-hosted runner (see [operations.md](operations.md)).
- The optional self-hosted pieces (Fastify API, BullMQ worker, PostgreSQL adapter) are not used by the live site and have not been run against a live database.
- Not connected: CAG audit findings (the site blocks traffic from outside India), CBDT direct-tax collections, central tenders (CPPP) and the MCA company register (data.gov.in's API was down when tried).
