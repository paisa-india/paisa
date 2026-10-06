import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { Dataset } from "../packages/schema/index";
import { budgetGroups } from "../apps/web/lib/budget-view";
const dataset = JSON.parse(
  await readFile(new URL("../data/published.json", import.meta.url), "utf8"),
) as Dataset;

test("visual budget includes every source record exactly once and preserves every paise", () => {
  for (const [year, kind] of [
    ["2026-27", "BE"],
    ["2025-26", "BE"],
    ["2025-26", "RE"],
    ["2024-25", "ACTUAL"],
  ]) {
    const rows = dataset.records.filter(
      (r) =>
        r.group === "expenditure" &&
        r.fiscalYear === year &&
        r.valueType === kind,
    );
    for (const input of [1n, 99n, 10000n, 10000001n, 99999999999999n]) {
      const groups = budgetGroups(rows, input);
      assert.deepEqual(
        groups.flatMap((g) => g.records.map((r) => r.id)).sort(),
        rows.map((r) => r.id).sort(),
      );
      assert.equal(
        groups.reduce((s, g) => s + g.rupees, 0n),
        rows.reduce((s, r) => s + BigInt(r.amountRupees), 0n),
      );
      assert.equal(
        groups.reduce((s, g) => s + g.paise, 0n),
        input,
      );
      assert.equal(
        groups.reduce((s, g) => s + g.tiles, 0),
        100,
      );
    }
  }
});
test("category colours and ordering remain stable across budget years", () => {
  const groups = (year: string) =>
    budgetGroups(
      dataset.records.filter(
        (r) =>
          r.group === "expenditure" &&
          r.fiscalYear === year &&
          r.valueType === "BE",
      ),
    );
  assert.deepEqual(
    groups("2025-26").map((g) => [g.id, g.colour]),
    groups("2026-27").map((g) => [g.id, g.colour]),
  );
  assert.deepEqual(budgetGroups([]), []);
});
