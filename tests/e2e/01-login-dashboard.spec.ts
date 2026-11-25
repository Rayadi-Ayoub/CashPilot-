import { expect, test } from "@playwright/test";
import { login, mainNav } from "./helpers";

test("Scenario 1 – the owner signs in and sees the dashboard", async ({ page }) => {
  await login(page, "owner");

  await expect(page.getByRole("heading", { level: 1, name: "CashPilot Demo SARL overview" })).toBeVisible();
  await expect(page.getByText("REAL CASH", { exact: true })).toBeVisible();
  await expect(page.locator(".sidebar-user")).toContainText("Amira Owner");
  await expect(page.locator(".sidebar-user")).toContainText("Owner");
  await expect(mainNav(page).getByRole("link", { name: "Invoices" })).toBeVisible();
});

// Uses the collaborator account so the owner (signed in by scenario 1 and the
// setup step) stays well below any per-account login limit.
test("Scenario 1b – a wrong password is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("collaborator@cashpilot.demo");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login\?error=/);
  await expect(page.locator(".form-message.error")).toContainText("Invalid email or password.");
});
