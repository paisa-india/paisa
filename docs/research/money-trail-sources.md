# Following the money: source research

Research date: 5 October 2026. This note asks, layer by layer, whether India publishes enough official data to answer:

> Who paid → which government received it → where it went → which city or village → which project → which contract → which company was paid → what got built (with a photo)?

**Verification key.** ✅ checked directly from this machine (file downloaded or API called). 🔎 confirmed from official pages or documents found by search, but not fetched here. ⚠️ blocked, unclear, or needs a decision.

## Bottom line

- **Money in, the Union, and the states are well covered.** Several sources have monthly updates and many past years. Paisa can show near-real-time state totals in rupees, not just shares.
- **Cities are covered for thousands of urban bodies** through cityfinance.in (FY 2015-16 to 2023-24). Reuse terms need confirming before bulk use.
- **Projects are partly covered.** There's a strong monthly source for big central projects (₹150 crore and above, with cost and time overruns) and a complete source for rural roads. City projects are scattered.
- **Contracts are the weakest public layer.** Award data exists, but most portals put it behind CAPTCHAs. Paisa must not bypass these, so this needs official bulk feeds or partnerships.
- **Actual payments to contractors are mostly not public.** Paisa should say so plainly and never infer them.
- **Photos exist for rural assets** (two geotagged photos per MGNREGA asset, published on ISRO's Bhuvan). Reuse rights are unclear, so link to them; don't copy them.

## Layer by layer

| Layer | Source | Coverage and history | Updates | Automation | Status |
|---|---|---|---|---|---|
| Money in: Union taxes and receipts | Union Budget (indiabudget.gov.in) | National; actual, revised and budget figures for 3 years | Annual (Feb) | ✅ automatic | **Connected** |
| Money in: Union, actual to date | CGA monthly accounts (cga.nic.in) | National monthly cumulative totals | Monthly | ✅ automatic | **Connected** |
| Money in: GST by state | Finance Ministry / GSTN monthly GST release ([Apr 2026 PDF](https://tutorial.gst.gov.in/downloads/news/for_publishing_monthly_gst_data_for_apr_2026.pdf)) | State-wise gross collections, current vs last year | Monthly (1st of month) | 🔎 PDF; likely automatable | Not connected |
| Money in: direct taxes | CBDT time series and press releases | National | Periodic | 🔎 | Not connected |
| Union → states: tax share | PIB releases of devolution instalments ([example](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2091732)) | State-wise amounts per instalment (e.g. 1 Aug 2026: UP ₹19,208 cr, Maharashtra ₹7,022 cr) | Monthly plus extra instalments | 🔎 HTML; automatable | Not connected |
| States: comparable shares | RBI *State Finances 2025-26*, Statements 33–34 | 31 states/UTs; 2023-24 accounts, 2024-25 budget and revised, 2025-26 budget | Annual | ⚠️ bot-protected; manual download | **Connected** (shares) |
| States: rupee amounts | RBI appendix tables (same publication, 8 files per table) | Item-wise ₹ by state | Annual | ⚠️ manual download | Not connected |
| States: monthly actual rupees | CAG / Accountant General **Monthly Key Indicators** (e.g. [UP](https://cag.gov.in/ae/allahabad/en/state-accounts-report?defuat_account_report_type=360), [Gujarat](https://cag.gov.in/ae/gujarat/en/state-accounts-report?defuat_account_report_type=360)) | Each state's receipts, spending and borrowing to date vs budget; PDF and Excel | Monthly | 🔎 cag.gov.in didn't respond from this machine; test from a server in India | **Top priority** |
| States: audited year-end | CAG State Finances Audit Reports and Accounts at a Glance | Per state, many years | Annual | 🔎 PDF | Not connected |
| States: own portals | Maharashtra BEAMS ([MIS reports](https://beams.mahakosh.gov.in/Beams5/BudgetMVC/MISRPT/MIST1.jsp)); UP [Koshvani](https://koshvani.up.nic.in/KoshvaniStatic.aspx) (treasury data since 2005) | Department/month-wise spending; Koshvani down to scheme level | Daily/monthly | 🔎 portal-specific | Later; one state at a time |
| Cities: PMC | PMC audited accounts PDF | Pune, FY 2024-25 | Annual | ✅ | **Connected** |
| Cities: national | [cityfinance.in](https://www.cityfinance.in/municipal-data/national) (MoHUA, run by Janaagraha) | 4,332 urban bodies, 16,726 statements, FY 2015-16 to 2023-24 | Annual (last updated 11 Dec 2024) | ✅ public JSON API lists states, cities, years and each city's statement files (Pune 2023-24 Balance Sheet, I&E and schedules, audited and unaudited). Some download paths use CAPTCHA/OTP. ⚠️ No reuse licence found | **Ask Janaagraha/MoHUA for terms and a bulk feed**, then connect |
| Villages: panchayats | eGramSwaraj | Plans and spending per gram panchayat | Ongoing | ⚠️ CAPTCHA on parts | Later |
| Villages: works | MGNREGA MIS (nrega.nic.in) | Works, cost, spending per panchayat | Daily | 🔎 public reports | Later |
| Projects: large central | MoSPI **PAIMANA** monthly Flash Report ([portal](https://paimana-proj.mospi.gov.in/), [Nov 2025 PDF](https://www.mospi.gov.in/uploads/publications_reports/publications_reports1766750411889_7ee823bf-ce0a-428c-9c38-4f12ee328f76_FlashReport_November_2025.pdf)) | ~1,775–1,990 projects ≥ ₹150 cr; original vs anticipated cost, spending, delays, by ministry/state | Monthly; quarterly detail | 🔎 PDFs; the portal didn't respond from this machine | **Top priority** (also feeds cost-change Signals) |
| Projects: rural roads | PMGSY OMMAS citizen section (omms.nic.in) | Every PMGSY road: sanctioned cost, length, status, money released vs used | Ongoing | 🔎 didn't respond from this machine | Next wave |
| Projects: railways | Railway Board "Pink Book" (project-wise outlays) | Every sanctioned work by zone | Annual | 🔎 Pink Book being replaced by zone-wise documents | Later |
| Contracts: central | CPPP (eprocure.gov.in) | Tenders and award details are mandatory for central bodies | Daily | ⚠️ CAPTCHA on listing/search pages | **Don't scrape.** Request a bulk/OCDS feed from NIC or the Department of Expenditure |
| Contracts: Maharashtra | MahaTenders (state e-procurement portal) | Results of tenders | Daily | ⚠️ CAPTCHA | Same as above |
| Contracts: open example | Assam procurement data in the Open Contracting Data Standard ([registry](https://data.open-contracting.org/en/publication/131), [data.gov.in](https://www.data.gov.in/catalog/assam-public-procurement-data)) | Assam tenders and awards | Regular | 🔎 published, structured data | **First contract layer to connect** |
| Payments to companies | PFMS / treasuries | Mostly login-only; Koshvani partly public | — | ⚠️ | Show "not public"; never infer |
| Photos | Bhuvan geo-MGNREGA (two geotagged photos per asset), PMAY-G, PMGSY GIS | Crores of rural assets | Ongoing | ⚠️ viewable publicly, reuse licence unclear | Link out; don't re-host |

General licence: datasets on data.gov.in use the **Government Open Data License – India** (2017), which allows commercial and non-commercial reuse with attribution and no implied endorsement. Its API needs a free key. Other sites set their own terms, so check each one before redistributing.

## Past years

| Layer | History available |
|---|---|
| Union | Decades of budget documents; CGA monthly archives |
| States | RBI back to 2005-06 editions; CAG audit reports for many years; Koshvani since 2005 |
| Cities | cityfinance.in FY 2015-16 to 2023-24 |
| Big projects | MoSPI archives of Flash Reports (e.g. Dec 2023) |

**Deltas** (this year vs last, budget vs actual, original vs anticipated project cost) are deterministic arithmetic over these official values. Paisa computes them; the AI never does.

## Automating it: calendar, collectors, and the AI's job

**1. Collectors run on a calendar (no AI, no cost):**

| Cadence | What |
|---|---|
| Daily | Contract feeds (once an official feed exists) |
| 1st–5th of each month | GST release; CGA (end of month) |
| Mid-month | CAG Monthly Key Indicators (each state's AG) |
| When published | MoSPI Flash Report; PIB devolution releases |
| Annually | Union Budget (daily in Jan–Feb); RBI State Finances (manual inbox); city accounts |

Each collector: conditional download → SHA-256 → parse → validate → publish, or fail safely and keep the last good data. The existing pipeline already does this for three sources.

**2. A weekly AI digest that reads and explains:**
- Inputs: that week's run logs, new or changed sources, numeric differences.
- Output: a short "What changed this week" page and GitHub issue. Example: "CAG published August for 18 states; Maharashtra spending to date is 41% of budget (last year: 38%); MoSPI added 12 projects; 3 projects' anticipated cost rose >25%."
- Every figure is copied from published records with a link; the AI only writes the sentences.

**3. AI fixes, people approve:**
- When a parser breaks, an AI agent drafts a fix as a PR with updated fixtures.
- When a new source is proposed, it drafts the connector.
- Merges stay human-approved.

**4. Manual inbox for blocked sources:**
- RBI (and anything else behind bot protection) gets an automatic reminder issue each year with the exact links. A maintainer downloads the files and the importer does the rest.

**Running it:** GitHub Actions cron for the collectors, plus a scheduled Claude routine or Claude Code GitHub Action for the digest and fixes, with a monthly spending cap. Expected AI cost is a few dollars a month for digests, plus occasional fix runs.

## Recommended order

1. **CAG Monthly Key Indicators:** monthly rupee actuals for every state. Turns the state view from shares into ₹ and near real time.
2. **MoSPI Flash Reports:** about 1,800 big projects with original vs anticipated cost and delays. Gives "which project, how much", feeds the cost-change and stale-progress Signals, and has archived months for history.
3. **cityfinance.in:** once terms are confirmed (email Janaagraha/MoHUA, and ask for a bulk export or API key). Covers 4,000+ cities over 9 years.
4. **PIB devolution and monthly GST:** Union → state and state tax trends, monthly.
5. **PMGSY roads plus Bhuvan photo links:** village-level projects with costs, and photos shown by link.
6. **Contracts:** connect Assam's open-contracting data first, and formally request bulk award data from NIC/CPPP and Maharashtra.

## Rules this research implies

- Never bypass CAPTCHA, OTP or bot protection. Use manual download, request a feed, or leave the gap visible.
- Treat each website's terms separately; a `.gov.in` domain doesn't mean open reuse.
- Award value is not payment, and a photo is not proof that a specific payment was made.
- Re-host images only with a clear licence; otherwise link to the official viewer.
- Run a reachability test from a server in India: CAG, MoSPI and OMMS didn't respond from this development machine.
