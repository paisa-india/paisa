# Methodology

## Source facts

Union Budget PDFs take precedence over spreadsheet variants. Four PDF artifacts supply 184 values across four fiscal columns: FY 2024–25 ACTUAL, FY 2025–26 BE, FY 2025–26 RE and FY 2026–27 BE. CGA supplies nine current-year cumulative provisional observations. The latter are unaudited, not final annual accounts.

A crore is exactly 10,000,000 rupees. Parsing multiplies integer crore figures using BigInt. Monetary amounts never use IEEE floating-point storage. A hash validates byte integrity; it does not certify that the government source itself is error-free. “Verified source extraction” means the local extraction and documented checks succeeded, not an independent audit of public accounts.

## Reconciliation

For each annual fiscal column, compare revenue + capital expenditure against total expenditure (₹1 crore tolerance), net tax + non-tax receipts against revenue receipts (₹1 crore), receipts plus loan recovery, other non-debt receipts and borrowing against expenditure (₹2 crore), and major expenditure items against total expenditure (₹5 crore). These tolerances accommodate the source's integer-crore rounding. Every actual difference and tolerance is retained. CGA aggregate checks use exact integer-crore equality.

Gross Union taxes differ from Centre-net tax receipts. Do not sum non-tax subcomponents into a gross-tax denominator. The Union Budget GST category is not all-India gross GST collections. Income tax includes STT in the connected source. Borrowing and cash-balance drawdown are financing, not revenue. Major-item expenditure is a purpose classification, not necessarily ministry totals.

## My Tax

Basis: the mutually exclusive official major-item expenditure rows in the selected annual column. Formula: user amount × row amount ÷ sum of rows. The row sum is used (rather than the separately rounded headline total) so the proportions reconcile exactly. Use integer paise, floor allocations, then distribute remaining paise in descending fractional-remainder order. Input order breaks ties deterministically. A ₹1 lakh input always produces a ₹1 lakh output total. This is an illustration, never a tax-to-project transaction trace.

## Comparisons

A full-year budget and April–August actual have different periods. Their comparison is descriptive, not a forecast or under-utilisation diagnosis. RE is always an estimate. Periods, fiscal year and classification are exposed on every record. No annualized spending projection or unsourced year-on-year change is calculated.
