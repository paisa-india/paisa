# POC acceptance status

| Supplied criterion | Status | Evidence / remaining work |
|---|---|---|
| 1. No sign-in | Implemented | All pages public locally |
| 2. Current Money In/Out | Implemented | FY 2026–27 BE + April–August provisional CGA actuals |
| 3. Major revenues | Implemented | Nine selected revenue rows; aggregate and financing context |
| 4. Union expenditure | Implemented | 23 major-item categories |
| 5. Budget vs actual | Implemented | Full-year versus cumulative period labels |
| 6. ₹1 lakh My Tax | Implemented | Exact integer-paise distribution, source links, disclaimer |
| 7. India → Maharashtra → Pune | Implemented | Zoomable map of all 36 states/UTs; 31 have RBI state shares, and Pune has audited city accounts |
| 8. Pune municipal finance | Implemented | Pune audited 2024-25 plus cityfinance 2015-16 to 2023-24; 4,000+ other cities also connected |
| 9. Project → tender → contract | Partial | 1,981 MoSPI central projects (cost, delay, progress) and 5,715 Assam contract awards. They are separate datasets, and no official link between a project and its contracts is connected yet |
| 10. Contractor and government awards | Implemented (Assam) | 5,715 awards and 2,912 contractor profiles from Assam OCDS (ODbL); conservative name grouping; awarded value ≠ payment |
| 11. Three functioning live Signals | Implemented: 4 live | Cost increase (242) and money-ahead-of-work (11) on MoSPI projects; single bid (243) and supplier concentration (4) on Assam awards. Low utilisation still needs a sourced seasonal baseline |
| 12. Important-value provenance | Implemented for connected data | Source drawers + API |
| 13. Original source | Implemented | Official government links |
| 14. English/Hindi | Partial | Key UI translated; detailed metadata and some explanatory text English |
| 15. Mobile usability | Implemented layout; review in progress | Responsive navigation, columns, source drawer; full accessibility audit pending |
| 16. Unattended normal ingestion | Partial | BullMQ schedules and two collectors; Redis deployment/long-run verification pending |
| 17. Truncated in supplied brief | Unknown | Original request ended after “Have a connector” |

This file deliberately distinguishes software scaffolding from live data coverage and operational deployment.
