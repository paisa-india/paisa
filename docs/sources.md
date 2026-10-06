# Source register

| Connector | Source | Connected coverage | Status |
|---|---|---|---|
| Union Budget | https://www.indiabudget.gov.in/doc/Budget_at_Glance/bag1.pdf | National aggregates, 4 fiscal columns | Implemented |
| Union Budget | https://www.indiabudget.gov.in/doc/Budget_at_Glance/bag5.pdf | Major Union revenue categories | Implemented |
| Union Budget | https://www.indiabudget.gov.in/doc/Budget_at_Glance/bag6.pdf | Major-item expenditure | Implemented |
| Union Budget | https://www.indiabudget.gov.in/doc/Budget_at_Glance/bag7.pdf | Five selected major schemes | Implemented |
| CGA | https://cga.nic.in/MonthlyReport/Published/8/2026-2027.aspx | Provisional monthly aggregates through August 2026 | Implemented; discovers report iframe |
| PMC accounts | [Financial-Statements-2024-25.pdf](https://adc-ecos.enlightcloud.com/1133pmcwebsitev2/s3fs-public/2025-12/Financial-Statements-2024-25.pdf?VersionId=f4cf885d-819e-4bdf-ae64-72639ff4eec7) (PMC website storage; also filed with BSE under SEBI LODR Reg. 52) | Audited FY 2024-25 revenue-account schedule totals, 18 lines | Implemented; pinned artifact, weekly conditional check |
| Map boundaries | [DataMeet `States/Admin2` @ 2c0c306](https://github.com/datameet/maps/tree/2c0c306a0c786a83876065a62b7b82646d8a639d/States), CC BY 4.0, Survey of India–based (J&K/Ladakh updated 2021) | 36 state/UT outlines, simplified | Build-time, SHA-256 pinned |
| RBI State Finances | [State Finances: A Study of Budgets 2025-26](https://rbi.org.in/Scripts/AnnualPublications.aspx?head=State+Finances+%3A+A+Study+of+Budgets) (Statements 33–34, XLSX) | 31 states/UTs × 2023-24 Accounts, 2024-25 BE/RE, 2025-26 BE: revenue receipts and expenditure components as % of GSDP (1,116 values) | Implemented. Annual manual browser download (rbidocs blocks scripts) → `data/inbox/` → `scripts/import-rbi.ts` → `npm run ingest` |
| City accounts | [cityfinance.in](https://www.cityfinance.in/municipal-data/national) public data API (`/api/v1/ulbs`, `/api/v1/dashboard/city/bs-is`), Ministry of Housing and Urban Affairs, run by Janaagraha | Standardised income & expenditure statements (NMAM codes) for every listed urban local body, FY 2015-16 to 2023-24; city location and population | Implemented. One request per city at about one per second; monthly check of cityfinance's last-updated date; permission to republish requested |
| MoSPI projects | [Flash Report, April 2026](https://www.mospi.gov.in/uploads/publications_reports/publications_reports1779688125413_332125c5-1fb9-4d23-87ca-dd89fc14cd15_Flash_Report_April_2026.pdf) (PAIMANA) | 1,981 ongoing central projects ≥ ₹150 cr: agency, ministry, state, original/revised cost and completion dates, spending, physical progress | Implemented. Reconciled with the report's group totals and Table 1. New months come from the reviewed link list or MoSPI's monthly URL. The publication-list API refuses scripts, so the daily run opens a reminder when Paisa is behind |
| Assam contracts | [CivicDataLab assam-tenders-data](https://github.com/CivicDataLab/assam-tenders-data) (`current/ocds_mapped_data.json.zip`, pinned commit), ODbL 1.0, compiled with the Assam Finance Department | 5,715 contract awards (tenders 2019–2023), 2,912 contractors, 80 departments, bid counts | Implemented. Daily check for a new commit; derived data in `data/contracts.json` is ODbL |
| CBDT | https://incometax.gov.in/ | None | Not connected |
| City Finance | https://www.cityfinance.in/ | None | Not connected |
| data.gov.in | https://www.data.gov.in/ | None | Not connected |
| CPPP | https://eprocure.gov.in/ | None | Not connected |
| CAG | https://cag.gov.in/ | None | Not connected |

Each artifact manifest under `data/snapshots` records retrieval, headers, URL, hash, parser version, attribution and licensing state. The initial recorded PDF retrieval is 5 October 2026. The manifests and `/sources` UI provide exact timestamps. Licences are tracked separately from software licensing; no uniform licence is assumed from a government domain.

The source registry is not a claim that unconnected providers are healthy. Requests must remain public and authorized; no CAPTCHA, authentication or access-control bypass is permitted.
