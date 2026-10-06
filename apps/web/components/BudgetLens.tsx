"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowRight, Info, Layers3 } from "lucide-react";
import type { MoneyRecord } from "../../../packages/schema/index";
import { formatMoney, formatPaise } from "../../../packages/calculations/index";
import { budgetGroups } from "../lib/budget-view";
import { assignTiles, placeTiles } from "../lib/tiles";
import { NATIONAL } from "../lib/meaning";

/** An exact ₹100 allocation. Motion preserves tile identities across year changes. */
export default function BudgetLens({
  records,
  hi,
  onSource,
  amountPaise,
  period,
}: {
  records: MoneyRecord[];
  hi: boolean;
  onSource: (r: MoneyRecord) => void;
  amountPaise?: bigint;
  period: string;
}) {
  const t = (a: string, b: string) => (hi ? b : a);
  const groups = useMemo(
    () => budgetGroups(records, amountPaise ?? 10000n),
    [records, amountPaise],
  );
  const [selected, setSelected] = useState("interest");
  const active = groups.find((g) => g.id === selected) ?? groups[0];
  const previous = useRef<(string | null)[]>(
    Array.from({ length: 100 }, () => null),
  );
  const layout = useMemo(() => {
    if (!groups.length)
      return { assigned: [] as string[], positions: [] as number[] };
    const order = groups.map((g) => g.id),
      assigned = assignTiles(
        previous.current,
        new Map(groups.map((g) => [g.id, g.tiles])),
        order,
      );
    return { assigned, positions: placeTiles(assigned, order) };
  }, [groups]);
  useEffect(() => {
    previous.current = layout.assigned;
  }, [layout]);
  if (!active)
    return (
      <p>
        {t(
          "No comparable spending breakdown is available.",
          "व्यय का तुलनीय विवरण उपलब्ध नहीं है।",
        )}
      </p>
    );
  const total = groups.reduce((s, g) => s + g.rupees, 0n);
  const share = Number((active.rupees * 10000n + total / 2n) / total) / 100;
  const meaning = NATIONAL[active.id];
  return (
    <div className="budget-lens">
      {amountPaise !== undefined && (
        <div className="lens-selection-summary" aria-live="polite">
          <i style={{ background: active.colour }} />
          <span>
            {hi ? active.labelHi : active.label}
            <small>
              {t(
                "Illustrated share of your amount",
                "आपकी राशि का आनुपातिक हिस्सा",
              )}
            </small>
          </span>
          <strong>{formatPaise(active.paise)}</strong>
        </div>
      )}
      <div className="lens-visual">
        <div className="lens-caption">
          <Layers3 size={16} />
          <span>
            {t(
              "100 pieces. One public budget.",
              "100 हिस्से। एक सार्वजनिक बजट।",
            )}
          </span>
        </div>
        <div
          className="money-mosaic"
          role="img"
          aria-label={
            t(
              "Rounded shares out of every ₹100: ",
              "हर ₹100 के पूर्णांकित हिस्से: ",
            ) +
            groups
              .map((g) => `${hi ? g.labelHi : g.label} ₹${g.tiles}`)
              .join(", ")
          }
        >
          {layout.assigned.map((id, i) => {
            const group = groups.find((g) => g.id === id)!;
            const pos = layout.positions[i];
            return (
              <span
                key={i}
                className={`mosaic-piece ${id === active.id ? "is-active" : "is-quiet"}`}
                style={
                  {
                    "--piece": group.colour,
                    left: `${(pos % 10) * 10}%`,
                    top: `${Math.floor(pos / 10) * 10}%`,
                    transitionDelay: `${(i % 7) * 12}ms`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
        <p className="lens-note">
          <Info size={13} />
          {t(
            "Each piece is ₹1 of ₹100, rounded. Choose a category below.",
            "हर हिस्सा ₹100 में से ₹1 है, पूर्णांकित। नीचे श्रेणी चुनें।",
          )}
        </p>
      </div>
      <div className="lens-content">
        <div
          className="lens-categories"
          role="group"
          aria-label={t("Choose a spending category", "व्यय श्रेणी चुनें")}
        >
          {groups.map((g) => (
            <button
              key={g.id}
              aria-pressed={g.id === active.id}
              onClick={() => setSelected(g.id)}
            >
              <i style={{ background: g.colour }} />
              <span>{hi ? g.labelHi : g.label}</span>
              <strong>₹{g.tiles}</strong>
            </button>
          ))}
        </div>
        <section
          className="lens-explanation"
          aria-live="polite"
          aria-atomic="true"
          style={{ "--category": active.colour } as CSSProperties}
        >
          <div className="lens-detail-top">
            <span>{hi ? active.labelHi : active.label}</span>
            <b>{share.toFixed(2)}%</b>
          </div>
          {amountPaise !== undefined && (
            <p className="lens-personal">
              <strong>{formatPaise(active.paise)}</strong>
              <span>
                {t(
                  "of your entered amount · proportional illustration",
                  "आपकी दर्ज राशि का · आनुपातिक उदाहरण",
                )}
              </span>
            </p>
          )}
          <p>
            {active.id === "rest"
              ? t(
                  "The remaining categories, including subsidies, administration and other expenditure. Expand to see the original figures.",
                  "सब्सिडी, प्रशासन और अन्य व्यय सहित शेष श्रेणियां। मूल आंकड़े देखने के लिए खोलें।",
                )
              : hi
                ? meaning?.whatHi
                : meaning?.what}
          </p>
          {active.records.length === 1 ? (
            <button
              className="lens-source"
              onClick={() => onSource(active.records[0])}
            >
              {t("National figure & source", "राष्ट्रीय राशि और स्रोत")}
              <strong>{formatMoney(active.rupees.toString())}</strong>
              <ArrowRight size={15} />
            </button>
          ) : (
            <details className="lens-rest">
              <summary>
                {t(
                  `See all ${active.records.length} categories`,
                  `सभी ${active.records.length} श्रेणियां देखें`,
                )}
              </summary>
              {active.records.map((r) => (
                <button key={r.id} onClick={() => onSource(r)}>
                  <span>{hi ? r.labelHi : r.label}</span>
                  <strong>{formatMoney(r.amountRupees)}</strong>
                </button>
              ))}
            </details>
          )}
          <small>{period}</small>
        </section>
      </div>
    </div>
  );
}
