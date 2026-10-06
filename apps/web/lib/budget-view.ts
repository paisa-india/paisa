import type { MoneyRecord } from "../../../packages/schema/index";
import { apportion } from "../../../packages/calculations/index";

// Persistent colours and order make comparisons readable when the year changes.
const order = [
  "interest",
  "transport",
  "defence",
  "pension",
  "rural",
  "education",
  "health",
];
const colours = [
  "#23796a",
  "#d3923d",
  "#697db0",
  "#9576a4",
  "#6f9255",
  "#b56856",
  "#548da1",
];
export type BudgetGroup = {
  id: string;
  label: string;
  labelHi: string;
  colour: string;
  rupees: bigint;
  records: MoneyRecord[];
  tiles: number;
  paise: bigint;
};
export function budgetGroups(
  records: MoneyRecord[],
  amountPaise = 10000n,
): BudgetGroup[] {
  const groups = order.flatMap((metric, i) => {
    const rows = records.filter((r) => r.metric === metric);
    if (!rows.length) return [];
    return [
      {
        id: metric,
        label: rows[0].label,
        labelHi: rows[0].labelHi,
        colour: colours[i],
        rupees: rows.reduce((s, r) => s + BigInt(r.amountRupees), 0n),
        records: rows,
      },
    ];
  });
  const rest = records.filter((r) => !order.includes(r.metric));
  if (rest.length)
    groups.push({
      id: "rest",
      label: "All other spending",
      labelHi: "बाकी सभी व्यय",
      colour: "#a1aaa0",
      rupees: rest.reduce((s, r) => s + BigInt(r.amountRupees), 0n),
      records: rest,
    });
  if (!groups.length || groups.every((g) => g.rupees === 0n)) return [];
  const weights = groups.map((g) => g.rupees),
    tiles = apportion(100n, weights);
  // Allocate the original categories first: grouping the display must not
  // change an individual category's last paisa through a second rounding.
  const sorted = [...records].sort((a, b) =>
    BigInt(a.amountRupees) === BigInt(b.amountRupees)
      ? 0
      : BigInt(a.amountRupees) > BigInt(b.amountRupees)
        ? -1
        : 1,
  );
  const shares = apportion(
    amountPaise,
    sorted.map((r) => BigInt(r.amountRupees)),
  );
  const byId = new Map(sorted.map((r, i) => [r.id, shares[i]]));
  return groups.map((g, i) => ({
    ...g,
    tiles: Number(tiles[i]),
    paise: g.records.reduce((sum, r) => sum + byId.get(r.id)!, 0n),
  }));
}
