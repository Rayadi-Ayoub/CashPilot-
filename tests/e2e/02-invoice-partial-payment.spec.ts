import { expect, test } from "@playwright/test";
import { authFile, createValidatedInvoice, detailValue, recordPayment, successMessage } from "./helpers";

test.use({ storageState: authFile("manager") });

test("Scenario 2 – create, validate and partially pay an invoice: the remaining amount decreases", async ({ page }) => {
  await createValidatedInvoice(page, "1000");
  await expect(page.getByRole("heading", { level: 1, name: /^INV-\d{4}-\d{4}$/ })).toBeVisible();
  await expect(page.locator(".page-header .badge")).toHaveText("Validated");
  await expect(detailValue(page, "Remaining")).toContainText("1,000.00");

  await recordPayment(page, "400");

  await expect(successMessage(page)).toContainText("Payment recorded and remaining amount updated.");
  await expect(detailValue(page, "Remaining")).toContainText("600.00");
  await expect(page.getByRole("heading", { name: "Payment history · 1" })).toBeVisible();
});
