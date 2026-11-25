import { expect, test } from "@playwright/test";
import { createValidatedInvoice, detailValue, errorMessage, login, recordPayment } from "./helpers";

test("Scenario 3 – RM1: a payment above the remaining amount is rejected", async ({ page }) => {
  await login(page, "manager");
  await createValidatedInvoice(page, "300");
  await expect(detailValue(page, "Remaining")).toContainText("300.00");

  await recordPayment(page, "300.01");

  await expect(errorMessage(page)).toContainText("Payment exceeds the remaining amount of 300.00 DT.");
  await expect(detailValue(page, "Remaining")).toContainText("300.00");
  await expect(page.getByRole("heading", { name: "Payment history · 0" })).toBeVisible();
});
