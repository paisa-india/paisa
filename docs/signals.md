# Signals

Five rules are implemented in `packages/signals`. All thresholds are configurable through the evaluator argument. Evidence must identify a source and comparison period and explicitly confirm comparability. No AI anomaly detection is used.

1. Progress gap: financial utilisation ≥75% and physical completion ≤50%; report percentage-point difference.
2. Cost change: comparable sanctioned-to-sanctioned or award-to-award increase ≥25%. Reject mixed value types and a zero denominator.
3. Low utilisation: actual expenditure ≥20 percentage points below a supplied, sourced seasonal baseline; suppress before month 6 or without the baseline. BE/RE basis is explicit.
4. Low bid count: officially reported bid count ≤1, positive integral counts only.
5. Supplier concentration: supplier awarded value ≥60% of the selected comparison set, requiring at least five contracts. The comparison-set description must identify department, category, geography and period.

Every result includes rule, inputs and threshold values, formula, comparison period, source, generated timestamp, explanation, limitations and: “Automated signal generated from public data. This does not establish wrongdoing, waste or corruption.”

All current UI examples are synthetic and marked as such. Public API results contain zero live Signals because the required project and procurement records are not connected. Never convert these fixtures into published observations. Supplier concentration does not mean suspicious activity. Advance payments, scope changes and reporting lags may explain observations.
