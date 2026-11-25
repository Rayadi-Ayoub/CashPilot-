import { expect, test } from "@playwright/test";
import { login, logout, pdfReceipt, successMessage, uniqueSuffix } from "./helpers";

test("Scenario 4 – a collaborator submits an expense, the owner approves it and it is marked paid", async ({ page }) => {
  const description = `E2E taxi ${uniqueSuffix()}`;

  // 1. Collaborator submits the expense with a receipt.
  await login(page, "collaborator");
  await page.goto("/expenses");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Submit for approval" }) });
  await form.getByLabel("Category").selectOption("Travel");
  await form.getByLabel("Description").fill(description);
  await form.getByLabel("Amount (DT)").fill("45.50");
  await form.getByLabel("Receipt").setInputFiles(pdfReceipt());
  await form.getByRole("button", { name: "Submit for approval" }).click();

  await expect(successMessage(page)).toContainText("Expense submitted for approval.");
  const row = page.getByRole("row").filter({ hasText: description });
  await expect(row).toContainText("Pending approval");
  await logout(page);

  // 2. Owner approves it.
  await login(page, "owner");
  await page.goto("/expenses");
  await page.getByRole("link", { name: description }).click();
  await expect(page.getByRole("heading", { level: 1, name: description })).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(successMessage(page)).toContainText("Expense approved.");
  await expect(page.locator(".page-header .badge")).toHaveText("Approved");

  // 3. Owner records the payment.
  await page.getByRole("button", { name: "Mark as paid" }).click();
  await expect(successMessage(page)).toContainText("Expense payment recorded.");
  await expect(page.locator(".page-header .badge")).toHaveText("Paid");
});
