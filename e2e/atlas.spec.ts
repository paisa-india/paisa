import { test, expect } from "@playwright/test";

test("the home atlas selects a state and opens its real records", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Maharashtra: data connected", exact: true })
    .click();
  const summary = page.getByRole("complementary", { name: "Place summary" });
  await expect(summary.getByRole("heading")).toHaveText("Maharashtra.");
  await summary
    .getByRole("link", { name: "Explore Maharashtra", exact: true })
    .click();
  await expect(page).toHaveURL(/state=maharashtra/);
});

test("the hundred-piece view preserves all tiles when its basis changes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "₹ India in ₹100", exact: true })
    .click();
  await expect(page.locator(".mosaic-piece")).toHaveCount(100);
  await page.getByLabel("Spending basis").selectOption("2024-25:ACTUAL");
  await page.getByRole("button", { name: /^Education ₹/ }).click();
  await expect(page.locator(".lens-explanation")).toContainText("Education");
  await expect(page.locator(".lens-explanation")).toContainText(
    "Full-year actual",
  );
  await expect(page.locator(".mosaic-piece")).toHaveCount(100);
  await page.getByRole("button", { name: /National figure & source/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Education");
});

test("mobile tax shows the personal illustration and rejects invalid amounts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/my-tax/");
  await page.getByRole("textbox", { name: "Tax paid in rupees" }).fill("100");
  await expect(page.locator(".lens-selection-summary")).toContainText("₹26.26");
  await page.getByRole("button", { name: /^Health ₹/ }).click();
  await expect(page.locator(".lens-selection-summary")).toContainText("Health");
  await page.getByRole("textbox", { name: "Tax paid in rupees" }).fill("0");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Enter an amount greater than zero." }),
  ).toBeVisible();
  await expect(page.locator(".mosaic-piece")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("navigation", { name: "Quick navigation" }),
  ).toBeVisible();
});

test("a failed homepage map can be retried without a page reload", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/geo/india-states.json", (route) =>
    fail ? route.abort() : route.continue(),
  );
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Retry map" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry map" }).click();
  await expect(
    page.getByRole("button", {
      name: "Maharashtra: data connected",
      exact: true,
    }),
  ).toBeVisible();
});
