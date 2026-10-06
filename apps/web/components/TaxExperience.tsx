"use client";
import { useMemo, useState } from "react";
import { Info, LockKeyhole } from "lucide-react";
import type { Dataset, MoneyRecord } from "../../../packages/schema/index";
import {
  formatPaise,
  parseRupeesToPaise,
} from "../../../packages/calculations/index";
import BudgetLens from "./BudgetLens";

export default function TaxExperience({
  dataset,
  hi,
  onSource,
}: {
  dataset: Dataset;
  hi: boolean;
  onSource: (r: MoneyRecord) => void;
}) {
  const [input, setInput] = useState("100000"),
    [basis, setBasis] = useState("2026-27:BE");
  const t = (a: string, b: string) => (hi ? b : a);
  const [fy, kind] = basis.split(":");
  const rows = useMemo(
    () =>
      dataset.records.filter(
        (r) =>
          r.group === "expenditure" &&
          r.fiscalYear === fy &&
          r.valueType === kind,
      ),
    [dataset, fy, kind],
  );
  let amount = 0n,
    error = "";
  try {
    amount = parseRupeesToPaise(input);
    if (amount === 0n)
      error = t(
        "Enter an amount greater than zero.",
        "शून्य से अधिक राशि डालें।",
      );
  } catch {
    error = t(
      "Enter a valid amount, with up to two decimal places.",
      "अधिकतम दो दशमलव स्थानों के साथ वैध राशि डालें।",
    );
  }
  const period = `${fy} · ${kind === "BE" ? t("Budget estimate", "बजट अनुमान") : kind === "RE" ? t("Revised estimate", "संशोधित अनुमान") : t("Full-year actual", "पूरे वर्ष के वास्तविक आंकड़े")}`;
  return (
    <section
      className="tax-experience"
      aria-label={t("Your tax in perspective", "आपके कर का आनुपातिक उदाहरण")}
    >
      <div className="tax-workbench">
        <label className="tax-amount-label">
          {t("Enter an amount in rupees", "रुपयों में राशि दर्ज करें")}
          <span>
            <b aria-hidden="true">₹</b>
            <input
              aria-label={t("Tax paid in rupees", "रुपयों में दिया कर")}
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-invalid={!!error}
              aria-describedby="tax-input-note"
            />
          </span>
        </label>
        <div className="tax-quick">
          <span>{t("Try an amount", "राशि चुनें")}</span>
          <div>
            {["100", "1000", "10000", "100000"].map((n) => (
              <button
                key={n}
                aria-pressed={input === n}
                onClick={() => setInput(n)}
              >
                ₹{Number(n).toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>
        <label className="tax-basis">
          {t("Spending basis", "व्यय का आधार")}
          <select value={basis} onChange={(e) => setBasis(e.target.value)}>
            <option value="2026-27:BE">
              2026–27 · {t("Budget estimate", "बजट अनुमान")}
            </option>
            <option value="2025-26:RE">
              2025–26 · {t("Revised estimate", "संशोधित अनुमान")}
            </option>
            <option value="2024-25:ACTUAL">
              2024–25 · {t("Actual", "वास्तविक")}
            </option>
          </select>
        </label>
      </div>
      <p className="tax-short-note" id="tax-input-note">
        <Info size={15} />
        {t(
          "A proportional illustration of Union spending. Your individual tax payment cannot be traced to these recipients.",
          "केंद्र के व्यय का आनुपातिक उदाहरण। आपके व्यक्तिगत कर को इन प्राप्तकर्ताओं तक नहीं जोड़ा जा सकता।",
        )}
      </p>
      {error ? (
        <p className="load-error" role="alert">
          {error}
        </p>
      ) : (
        <>
          <div className="tax-visual-heading">
            <div>
              <span className="atlas-eyebrow">
                {t(
                  "YOUR AMOUNT. THE BIGGER PICTURE.",
                  "आपकी राशि। बड़ी तस्वीर।",
                )}
              </span>
              <h2>
                {formatPaise(amount)}
                <small>
                  {t(
                    "split like Union spending",
                    "केंद्र के व्यय के अनुपात में",
                  )}
                </small>
              </h2>
            </div>
            <span className="badge calculated">
              {t("Calculated", "गणना आधारित")}
            </span>
          </div>
          <BudgetLens
            records={rows}
            hi={hi}
            onSource={onSource}
            amountPaise={amount}
            period={period}
          />
        </>
      )}
      <div className="tax-method">
        <p>
          <LockKeyhole size={15} />
          {t(
            "Private by design. Calculated here, never sent or saved.",
            "आपकी गोपनीयता सुरक्षित। गणना यहीं होती है, न भेजी जाती है न सहेजी।",
          )}
        </p>
        <details>
          <summary>
            {t("How this illustration works", "यह उदाहरण कैसे काम करता है")}
          </summary>
          <p>
            {t(
              "Your amount × category expenditure ÷ total expenditure in this breakdown. We distribute rounding remainders so every paise is accounted for. The 100 pieces show rounded whole-rupee shares; the amounts use the underlying figures.",
              "आपकी राशि × श्रेणी का व्यय ÷ इस विवरण का कुल व्यय। पूर्णांकन का शेष बांटा जाता है ताकि हर पैसे का हिसाब रहे। 100 हिस्से पूर्णांकित अनुपात दिखाते हैं; राशि मूल आंकड़ों पर आधारित है।",
            )}
          </p>
          <p>
            {t(
              "Taxes enter a common pool. This does not show where your personal payment went. State and city taxes fund their own budgets too. A budget estimate is a plan, not actual spending.",
              "कर एक साझा कोष में जाते हैं। यह आपके व्यक्तिगत भुगतान का पता नहीं दिखाता। राज्य और शहर के कर उनके बजट को भी धन देते हैं। बजट अनुमान योजना है, वास्तविक व्यय नहीं।",
            )}
          </p>
        </details>
      </div>
    </section>
  );
}
