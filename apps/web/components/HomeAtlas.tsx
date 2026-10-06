"use client";
import {trackUsage} from "../lib/analytics";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Globe2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Dataset, MoneyRecord } from "../../../packages/schema/index";
import { geographies } from "../../../packages/schema/index";
import { formatMoney } from "../../../packages/calculations/index";
import IndiaMap from "./IndiaMap";
import BudgetLens from "./BudgetLens";
import { PlaceSearch } from "./PlaceSearch";
import { useCityIndex, useStateCities, shortCityName } from "./Cities";
import { LoadError } from "./LoadError";

export default function HomeAtlas({
  dataset,
  hi,
  onSource,
}: {
  dataset: Dataset;
  hi: boolean;
  onSource: (r: MoneyRecord) => void;
}) {
  const t = (a: string, b: string) => (hi ? b : a);
  const router = useRouter();
  const [view, setView] = useState<"map" | "money">("map"),
    [state, setState] = useState<string | null>(null),
    [basis, setBasis] = useState("2026-27:BE");
  const index = useCityIndex();
  const { file: stateCities, failed, retry } = useStateCities(state);
  const states = geographies.filter((g) => g.parentId === "india");
  const connected = useMemo(
    () =>
      new Set([
        ...Object.keys(dataset.citiesSummary?.byState ?? {}),
        ...Object.keys(dataset.projectsSummary?.byState ?? {}),
      ]),
    [dataset],
  );
  const labels = Object.fromEntries(
    states.map((s) => [s.id, hi ? s.nameHi : s.name]),
  );
  const selectState = useCallback((id: string) => {setState(id); trackUsage('place_selected');}, []);
  const back = useCallback(() => setState(null), []);
  const openCity = useCallback(
    (id: string) => {
      const s = state ?? index?.cities.find((c) => c.id === id)?.s;
      if (s) router.push(`/projects?state=${s}&city=${id}`);
    },
    [router, state, index],
  );
  const dots = state
    ? (stateCities?.cities ?? [])
        .filter((c) => c.lat !== null && c.lng !== null)
        .map((c) => ({
          id: c.id,
          label: shortCityName(c.name),
          lat: c.lat!,
          lng: c.lng!,
          size: Math.min(
            1,
            Math.max(0, (Math.log10(c.population ?? 10000) - 4) / 3),
          ),
          hasData: c.ys > 0,
        }))
    : (index?.cities ?? []).map((c) => ({
        id: c.id,
        label: shortCityName(c.n),
        lat: c.lat,
        lng: c.lng,
        size: Math.min(1, Math.max(0, (Math.log10(c.p ?? 10000) - 4) / 3)),
        hasData: true,
      }));
  const stateName = state ? labels[state] : t("India", "भारत");
  const ps = state
    ? dataset.projectsSummary?.byState[state]
    : dataset.projectsSummary;
  const cityCount = state
    ? (dataset.citiesSummary?.byState[state] ?? 0)
    : (dataset.citiesSummary?.withData ?? 0);
  const budget = dataset.records.find(
    (r) =>
      r.metric === "total-expenditure" &&
      r.group === "overview" &&
      r.fiscalYear === "2026-27" &&
      r.valueType === "BE",
  );
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
  const period = `${fy} · ${kind === "BE" ? t("Budget estimate", "बजट अनुमान") : kind === "RE" ? t("Revised estimate", "संशोधित अनुमान") : t("Full-year actual", "पूरे वर्ष के वास्तविक आंकड़े")}`;
  const featured = state
    ? (stateCities?.cities ?? [])
        .filter((c) => c.ys > 0)
        .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
        .slice(0, 3)
    : [];
  return (
    <section className="home-atlas" aria-labelledby="atlas-title">
      <div className="atlas-heading">
        <div>
          <span className="atlas-eyebrow">
            <span />
            {t("PUBLIC MONEY. YOUR WORLD.", "सार्वजनिक धन। आपकी दुनिया।")}
          </span>
          <h1 id="atlas-title">
            {t("A country of stories.", "हर जगह एक कहानी।")}
            <br />
            <em>{t("Start with yours.", "अपनी जगह से शुरू करें।")}</em>
          </h1>
          <p>
            {t(
              "See the places, plans and people behind public money.",
              "सार्वजनिक धन से जुड़ी जगहों, योजनाओं और लोगों को जानें।",
            )}
          </p>
        </div>
        <div className="atlas-search">
          <PlaceSearch
            big
            hi={hi}
            onPick={(p) =>
              router.push(
                p.kind === "state"
                  ? `/projects?state=${p.id}`
                  : `/projects?state=${p.stateId}&city=${p.id}`,
              )
            }
          />
          <span>
            <ShieldCheck size={13} />
            {t(
              "Public sources. No login. Always independent.",
              "सार्वजनिक स्रोत। लॉगिन नहीं। हमेशा स्वतंत्र।",
            )}
          </span>
        </div>
      </div>
      <div className="atlas-surface">
        <div className="atlas-toolbar">
          <div
            className="atlas-switch"
            role="group"
            aria-label={t("Choose your view", "दृश्य चुनें")}
          >
            <button
              aria-pressed={view === "map"}
              onClick={() => setView("map")}
            >
              <Globe2 size={16} />
              {t("Explore places", "जगहें खोजें")}
            </button>
            <button
              aria-pressed={view === "money"}
              onClick={() => setView("money")}
            >
              <span className="atlas-rupee">₹</span>
              {t("India in ₹100", "भारत को ₹100 में समझें")}
            </button>
          </div>
          <span className="atlas-toolbar-note">
            {view === "map"
              ? t("Choose a state to begin", "शुरू करने के लिए राज्य चुनें")
              : t(
                  "Tap a category. See what it means.",
                  "श्रेणी चुनें। उसका अर्थ जानें।",
                )}
          </span>
        </div>
        {view === "map" ? (
          <div className="atlas-map-layout">
            <div className="atlas-map">
              <IndiaMap
                standalone
                state={state}
                city={null}
                connected={connected}
                labels={labels}
                dots={dots}
                onState={selectState}
                onCity={openCity}
                onBack={back}
                hi={hi}
              />
              <nav
                className="atlas-breadcrumb"
                aria-label={t("Selected place", "चुनी गई जगह")}
              >
                <button
                  onClick={back}
                  aria-current={!state ? "location" : undefined}
                >
                  {t("India", "भारत")}
                </button>
                {state && (
                  <>
                    <ChevronRight size={13} />
                    <span>{stateName}</span>
                  </>
                )}
              </nav>
              {!state && budget && (
                <button
                  className="atlas-map-fact"
                  onClick={() => onSource(budget)}
                >
                  <small>
                    {t("2026–27 · Union plan", "2026–27 · केंद्रीय योजना")}
                  </small>
                  <strong>{formatMoney(budget.amountRupees)}</strong>
                </button>
              )}
              <span className="atlas-map-caption">
                <MapPin size={13} />
                {t(
                  "Tap a place. Follow your curiosity.",
                  "जगह चुनें। अपनी जिज्ञासा के साथ आगे बढ़ें।",
                )}
              </span>
            </div>
            <aside
              className="atlas-insight"
              aria-label={t("Place summary", "जगह का सारांश")}
            >
              <div className="atlas-insight-content" key={state ?? "india"}>
                <span className="atlas-eyebrow">
                  {state
                    ? t("YOUR PLACE, IN PERSPECTIVE", "आपकी जगह, एक नज़र में")
                    : t("THE BIG PICTURE", "बड़ी तस्वीर")}
                </span>
                <h2>
                  {stateName}
                  <span>.</span>
                </h2>
                {!state && budget ? (
                  <>
                    <p className="atlas-big-label">
                      {t(
                        "Union expenditure plan · 2026–27",
                        "केंद्र की व्यय योजना · 2026–27",
                      )}
                    </p>
                    <button
                      className="atlas-big-number"
                      onClick={() => onSource(budget)}
                    >
                      {formatMoney(budget.amountRupees)}
                      <ArrowUpRight size={18} />
                    </button>
                    <p className="atlas-insight-copy">
                      {t(
                        "From classrooms to railways. Discover what is planned, what is reported, and what we can verify.",
                        "कक्षाओं से रेलवे तक। जानें क्या योजना है, क्या दर्ज है और क्या सत्यापित है।",
                      )}
                    </p>
                  </>
                ) : (
                  <p className="atlas-insight-copy">
                    {t(
                      "Open local accounts and the central projects reported for this state or union territory.",
                      "इस राज्य या केंद्र शासित प्रदेश के स्थानीय खाते और दर्ज केंद्रीय परियोजनाएं देखें।",
                    )}
                  </p>
                )}
                <div className="atlas-counts">
                  <div>
                    <strong>{cityCount.toLocaleString("en-IN")}</strong>
                    <span>{t("cities with accounts", "शहरों के खाते")}</span>
                  </div>
                  <div>
                    <strong>
                      {(ps?.projects ?? 0).toLocaleString("en-IN")}
                    </strong>
                    <span>
                      {t("big central projects", "बड़ी केंद्रीय परियोजनाएं")}
                    </span>
                  </div>
                </div>
                <p className="atlas-coverage-note">
                  {t(
                    "Coverage varies by place and year. Projects ≥ ₹150 crore.",
                    "जगह और वर्ष के अनुसार उपलब्धता अलग है। परियोजनाएं ≥ ₹150 करोड़।",
                  )}
                </p>
                {state ? (
                  <Link
                    className="atlas-primary"
                    href={`/projects?state=${state}`}
                  >
                    {t(`Explore ${stateName}`, `${stateName} देखें`)}
                    <ArrowRight size={17} />
                  </Link>
                ) : (
                  <button
                    className="atlas-primary"
                    onClick={() => setView("money")}
                  >
                    {t("Make sense of it in ₹100", "₹100 में समझें")}
                    <ArrowRight size={17} />
                  </button>
                )}
                {failed && (
                  <LoadError hi={hi} what={["Cities", "शहर"]} onRetry={retry} />
                )}
                {featured.length > 0 && (
                  <div className="atlas-city-links">
                    <small>
                      {t("START WITH A CITY", "एक शहर से शुरू करें")}
                    </small>
                    {featured.map((c) => (
                      <button key={c.id} onClick={() => openCity(c.id)}>
                        <Building2 size={14} />
                        {shortCityName(c.name)}
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                )}
                {!state && (
                  <Link href="/my-tax" className="atlas-secondary">
                    <Sparkles size={15} />
                    {t("What about my own tax?", "मेरे कर का क्या?")}
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <div className="atlas-money">
            <div className="atlas-money-header">
              <div>
                <span className="atlas-eyebrow">
                  {t(
                    "SMALLER NUMBERS. A CLEARER PICTURE.",
                    "छोटे आंकड़े। स्पष्ट तस्वीर।",
                  )}
                </span>
                <h2>
                  {t(
                    "If India’s spending were ₹100…",
                    "अगर भारत का व्यय ₹100 होता…",
                  )}
                </h2>
              </div>
              <label>
                {t("Spending basis", "व्यय का आधार")}
                <select
                  value={basis}
                  onChange={(e) => setBasis(e.target.value)}
                >
                  <option value="2026-27:BE">
                    2026–27 · {t("Budget estimate", "बजट अनुमान")}
                  </option>
                  <option value="2025-26:BE">
                    2025–26 · {t("Budget estimate", "बजट अनुमान")}
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
            <BudgetLens
              records={rows}
              hi={hi}
              onSource={onSource}
              period={period}
            />
            <p className="atlas-basis-note">
              {t(
                "Union government spending only. Budget estimates are plans; actuals are recorded expenditure.",
                "केवल केंद्र सरकार का व्यय। बजट अनुमान योजना हैं; वास्तविक आंकड़े दर्ज व्यय हैं।",
              )}
            </p>
          </div>
        )}
      </div>
      <div className="atlas-foot">
        <span>
          <ShieldCheck size={15} />
          {t(
            "Every figure has a source. Every gap stays visible.",
            "हर आंकड़े का स्रोत। हर कमी स्पष्ट।",
          )}
        </span>
        <Link href="/sources">
          {t("How we know", "हम कैसे जानते हैं")}
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
