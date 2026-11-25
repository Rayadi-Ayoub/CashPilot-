import { expect, test } from "@playwright/test";
import { authFile, mainNav } from "./helpers";

test.use({ storageState: authFile("collaborator") });

test("Scenario 5 – a collaborator has no access to the Invoices page", async ({ page }) => {
  await page.goto("/dashboard");

  // The navigation only offers the collaborator's pages.
  await expect(mainNav(page).getByRole("link", { name: "Expenses" })).toBeVisible();
  await expect(mainNav(page).getByRole("link", { name: "Invoices" })).toHaveCount(0);

  // Opening the URL directly does not reveal any invoice data.
  await page.goto("/invoices");
  await expect(page.getByRole("heading", { level: 1, name: "Invoices" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);
  await expect(page.getByText("Carthage Retail")).toHaveCount(0);
});
