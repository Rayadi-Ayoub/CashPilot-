import { expect, test } from "@playwright/test";
import { authFile } from "./helpers";

test.use({ storageState: authFile("manager") });

test("Scenario 6 – a manager finds invoices by client name among the high-volume invoices", async ({ page }) => {
  await page.goto("/invoices");
  await expect(page.locator(".result-count")).toHaveText(/^\d+ invoices$/);

  const search = page.getByRole("search");
  await search.getByRole("textbox", { name: "Search" }).fill("Sfax");
  await search.getByRole("button", { name: "Search" }).click();

  // Server-side filtering: the query is in the URL and only matching rows are listed.
  await expect(page).toHaveURL(/[?&]q=Sfax/);
  await expect(page.locator(".result-count")).toHaveText(/^\d+ of \d+ invoices match$/);
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await expect(rows.nth(index)).toContainText("Sfax Wholesale");
  }
});

test("Scenario 6b – a search without match shows an empty state", async ({ page }) => {
  await page.goto("/invoices?q=no-such-client-xyz");

  await expect(page.getByText("No matching invoices")).toBeVisible();
  await expect(page.locator("table tbody tr")).toHaveCount(0);
});
