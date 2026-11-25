import { expect, test } from "@playwright/test";
import { authFile, pageAs, pdfReceipt, successMessage, uniqueSuffix } from "./helpers";

test.use({ storageState: authFile("collaborator") });

test("Scenario 4 – a collaborator submits an expense, the owner approves it and it is marked paid", async ({ page, browser }) => {
  const description = `E2E taxi ${uniqueSuffix()}`;

  // 1. Collaborator submits the expense with a receipt.
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

  // 2. Owner approves it, in a separate browser session.
  const owner = await pageAs(browser, "owner");
  await owner.goto("/expenses");
  await owner.getByRole("link", { name: description }).click();
  await expect(owner.getByRole("heading", { level: 1, name: description })).toBeVisible();
  await owner.getByRole("button", { name: "Approve" }).click();
  await expect(successMessage(owner)).toContainText("Expense approved.");
  await expect(owner.locator(".page-header .badge")).toHaveText("Approved");

  // 3. Owner records the payment.
  await owner.getByRole("button", { name: "Mark as paid" }).click();
  await expect(successMessage(owner)).toContainText("Expense payment recorded.");
  await expect(owner.locator(".page-header .badge")).toHaveText("Paid");
  await owner.context().close();
});
